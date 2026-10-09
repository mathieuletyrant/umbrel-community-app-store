import {afterAll, beforeEach, expect, test} from 'bun:test'
import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {freshrss} from '../src/apps/freshrss'

const credentialsDir = mkdtempSync(path.join(tmpdir(), 'freshrss-'))
writeFileSync(path.join(credentialsDir, 'username'), 'admin')
writeFileSync(path.join(credentialsDir, 'api_password'), 'secret\n')

let logins = 0
let rejectNextStream = false
let lastStreamUrl: URL | undefined

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
		if (url.pathname.includes('/reader/api/0/stream/contents/')) {
			lastStreamUrl = url
			if (rejectNextStream || request.headers.get('authorization') !== `GoogleLogin auth=token-${logins}`) {
				rejectNextStream = false
				return new Response('Unauthorized', {status: 401})
			}
			return Response.json({
				items: [
					{title: 'Tom &amp; Jerry&#039;s comeback', published: Date.now() / 1000 - 20 * 60, origin: {title: 'Cartoons'}},
					{title: 'No feed name', published: Date.now() / 1000 - 3 * 86_400},
				],
			})
		}
		return new Response('Not found', {status: 404})
	},
})
afterAll(() => greader.stop())

const apiUrl = `http://localhost:${greader.port}/api/greader.php`

beforeEach(() => {
	logins = 0
	rejectNextStream = false
})

test('lists the latest unread articles with their feed and age', async () => {
	const widget = await freshrss({apiUrl, credentialsDir}).unread!.read()

	expect(widget).toEqual({
		type: 'list',
		refresh: '2m',
		link: '/freshrss',
		items: [
			{text: "Tom & Jerry's comeback", subtext: 'Cartoons · 20 min. ago'},
			{text: 'No feed name', subtext: '3 days ago'},
		],
		noItemsText: 'No unread articles',
	})
	expect(decodeURIComponent(lastStreamUrl!.pathname)).toEndWith('/stream/contents/user/-/state/com.google/reading-list')
	expect(lastStreamUrl!.searchParams.get('xt')).toBe('user/-/state/com.google/read')
	expect(lastStreamUrl!.searchParams.get('n')).toBe('5')
})

test('reuses its token, and logs in again once FreshRSS rejects it', async () => {
	const unread = freshrss({apiUrl, credentialsDir}).unread!
	await unread.read()
	await unread.read()
	expect(logins).toBe(1)

	rejectNextStream = true
	await unread.read()
	expect(logins).toBe(2)
})

test('fails when the credentials are wrong, so the fallback is served', async () => {
	const otherDir = mkdtempSync(path.join(tmpdir(), 'freshrss-'))
	writeFileSync(path.join(otherDir, 'username'), 'admin')
	writeFileSync(path.join(otherDir, 'api_password'), 'wrong')
	const unread = freshrss({apiUrl, credentialsDir: otherDir}).unread!

	await expect(unread.read()).rejects.toThrow('HTTP 401')
	expect(unread.fallback).toEqual({type: 'list', refresh: '2m', link: '/freshrss', items: [], noItemsText: "Can't reach FreshRSS"})
})
