import {afterAll, beforeEach, expect, test} from 'bun:test'
import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {freshrss} from '../src/apps/freshrss'

const now = new Date('2026-10-09T12:00:00Z')
const nowSeconds = now.getTime() / 1000
const entryId = (secondsAgo: number) => String((nowSeconds - secondsAgo) * 1_000_000)

function credentials(password: string) {
	const dir = mkdtempSync(path.join(tmpdir(), 'freshrss-'))
	writeFileSync(path.join(dir, 'username'), 'admin')
	writeFileSync(path.join(dir, 'api_password'), password)
	return dir
}
const credentialsDir = credentials('secret\n')

let logins = 0
let rejectNextCall = false
const calls: URL[] = []

const greader = Bun.serve({
	port: 0,
	async fetch(request) {
		const url = new URL(request.url)
		if (url.pathname.endsWith('/accounts/ClientLogin')) {
			const form = new URLSearchParams(await request.text())
			if (form.get('Email') !== 'admin' || form.get('Passwd') !== 'secret') return new Response('Unauthorized', {status: 401})
			logins++
			return new Response(`SID=admin/x\nLSID=null\nAuth=token-${logins}\n`)
		}
		calls.push(url)
		if (rejectNextCall || request.headers.get('authorization') !== `GoogleLogin auth=token-${logins}`) {
			rejectNextCall = false
			return new Response('Unauthorized', {status: 401})
		}
		const endpoint = decodeURIComponent(url.pathname.split('/reader/api/0/')[1] ?? '')
		if (endpoint === 'stream/contents/user/-/state/com.google/reading-list') {
			return Response.json({
				items: [
					{title: 'Tom &amp; Jerry&#039;s comeback', published: nowSeconds - 20 * 60, origin: {title: 'Cartoons'}},
					{title: 'No feed name', published: nowSeconds - 3 * 86_400},
				],
			})
		}
		if (endpoint === 'unread-count') {
			return Response.json({
				unreadcounts: [
					{id: 'feed/1', count: 1200},
					{id: 'user/-/state/com.google/reading-list', count: 1234},
				],
			})
		}
		if (endpoint === 'stream/items/ids' && url.searchParams.get('s') === 'user/-/state/com.google/reading-list') {
			return Response.json({itemRefs: [{id: entryId(60)}, {id: entryId(23 * 3_600)}, {id: entryId(25 * 3_600)}]})
		}
		if (endpoint === 'stream/items/ids' && url.searchParams.get('s') === 'user/-/state/com.google/starred') {
			return Response.json({itemRefs: Array.from({length: 1000}, (_, i) => ({id: entryId(i)}))})
		}
		if (endpoint === 'subscription/list') return Response.json({subscriptions: [{}, {}, {}]})
		return new Response('Not found', {status: 404})
	},
})
afterAll(() => greader.stop())

const apiUrl = `http://localhost:${greader.port}/api/greader.php`
const app = (dir = credentialsDir) => freshrss({apiUrl, credentialsDir: dir, now: () => now})

beforeEach(() => {
	logins = 0
	rejectNextCall = false
	calls.length = 0
})

test('unread lists the latest unread articles with their feed and age', async () => {
	expect(await app().unread!.read()).toEqual({
		type: 'list',
		refresh: '2m',
		link: '/freshrss',
		items: [
			{text: "Tom & Jerry's comeback", subtext: 'Cartoons · 20 min. ago'},
			{text: 'No feed name', subtext: '3 days ago'},
		],
		noItemsText: 'No unread articles',
	})
	expect(calls[0]!.searchParams.get('xt')).toBe('user/-/state/com.google/read')
	expect(calls[0]!.searchParams.get('n')).toBe('5')
})

test('overview counts unread, fetched in the last 24 h, starred and feeds', async () => {
	expect(await app().overview!.read()).toEqual({
		type: 'four-stats',
		refresh: '5m',
		link: '/freshrss',
		items: [
			{title: 'Unread', text: '1,234', subtext: 'articles'},
			{title: 'Today', text: '2', subtext: 'new'},
			{title: 'Starred', text: '1000+'},
			{title: 'Feeds', text: '3'},
		],
	})
	expect(logins).toBe(1)
})

test('reuses its token, and logs in again once FreshRSS rejects it', async () => {
	const unread = app().unread!
	await unread.read()
	await unread.read()
	expect(logins).toBe(1)

	rejectNextCall = true
	await unread.read()
	expect(logins).toBe(2)
})

test('fails with wrong credentials, so the fallbacks are served', async () => {
	const widgets = app(credentials('wrong'))

	await expect(widgets.unread!.read()).rejects.toThrow('HTTP 401')
	await expect(widgets.overview!.read()).rejects.toThrow('HTTP 401')
	expect(widgets.unread!.fallback).toMatchObject({type: 'list', items: [], noItemsText: "Can't reach FreshRSS"})
	expect(widgets.overview!.fallback).toMatchObject({type: 'four-stats', items: [{title: 'Unread', text: '–'}, {}, {}, {}]})
})
