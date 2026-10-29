import {afterAll, beforeEach, expect, test} from 'bun:test'

import {qbittorrent} from '../src/sources/qbittorrent'

let logins = 0
let legacyLogin = false
let sessions = new Set<string>()
let errored: {name: string}[] = []
let filter: string | null = null

const api = Bun.serve({
	port: 0,
	async fetch(request) {
		const {pathname, searchParams} = new URL(request.url)
		if (pathname === '/api/v2/auth/login') {
			const form = new URLSearchParams(await request.text())
			if (form.get('username') !== 'admin' || form.get('password') !== 'secret') return new Response('Fails.')
			logins++
			const sid = `s${logins}`
			sessions.add(sid)
			const cookie = {'Set-Cookie': `QBT_SID_8080=${sid}; HttpOnly; path=/; SameSite=Strict`}
			return legacyLogin ? new Response('Ok.', {headers: cookie}) : new Response(null, {status: 204, headers: cookie})
		}
		const sid = request.headers.get('cookie')?.match(/QBT_SID_8080=([^;]+)/)?.[1]
		if (!sid || !sessions.has(sid)) return new Response('Forbidden', {status: 403})
		if (pathname === '/api/v2/torrents/info') {
			filter = searchParams.get('filter')
			return Response.json(errored)
		}
		return new Response('Not found', {status: 404})
	},
})
afterAll(() => api.stop())

const url = `http://localhost:${api.port}/`

beforeEach(() => {
	logins = 0
	legacyLogin = false
	sessions = new Set()
	errored = []
	filter = null
})

test('asks for torrents in error only, logging in once', async () => {
	const source = qbittorrent({name: 'qBittorrent', url, password: 'secret'})

	expect(await source.check!()).toEqual([])
	await source.check!()
	expect(filter).toBe('errored')
	expect(logins).toBe(1)
})

test('accepts the 200 "Ok." login answer of qBittorrent before 5.2', async () => {
	legacyLogin = true
	expect(await qbittorrent({name: 'qBittorrent', url, password: 'secret'}).check!()).toEqual([])
})

test('logs in again when the session expired', async () => {
	const source = qbittorrent({name: 'qBittorrent', url, password: 'secret'})
	await source.check!()
	sessions.clear()

	expect(await source.check!()).toEqual([])
	expect(logins).toBe(2)
})

test('reports torrents in error or with missing files as a warning', async () => {
	errored = [{name: 'Gone.2024.1080p'}]
	expect(await qbittorrent({name: 'qBittorrent', url, password: 'secret'}).check!()).toEqual([{level: 'warning', message: '1 torrent(s) in error: Gone.2024.1080p'}])
})

test('fails with a clear message on a wrong password', async () => {
	expect(qbittorrent({name: 'qBittorrent', url, password: 'wrong'}).check!()).rejects.toThrow(
		'qBittorrent refused the login: check its username and password',
	)
})

test('is not configured without a URL or a password', () => {
	expect(qbittorrent({name: 'qBittorrent', password: 'secret'}).check).toBeNull()
	expect(qbittorrent({name: 'qBittorrent', url}).check).toBeNull()
})
