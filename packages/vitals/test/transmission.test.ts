import {afterAll, beforeEach, expect, test} from 'bun:test'

import {transmission} from '../src/sources/transmission'

let handshakes = 0
let torrents: {error: number; errorString: string}[] = []

const rpc = Bun.serve({
	port: 0,
	async fetch(request) {
		if (request.headers.get('x-transmission-session-id') !== 'session-1') {
			handshakes++
			return new Response('Conflict', {status: 409, headers: {'X-Transmission-Session-Id': 'session-1'}})
		}
		const {method} = (await request.json()) as {method: string}
		if (method === 'torrent-get') return Response.json({result: 'success', arguments: {torrents}})
		return Response.json({result: 'method name not recognized', arguments: {}})
	},
})
afterAll(() => rpc.stop())

const url = `http://localhost:${rpc.port}/transmission/rpc`

beforeEach(() => {
	handshakes = 0
	torrents = [
		{error: 0, errorString: ''},
		{error: 0, errorString: ''},
	]
})

test('is healthy without torrents in error, after the session handshake', async () => {
	const source = transmission({name: 'Transmission', url})

	expect(await source.check!()).toEqual([])
	await source.check!()
	expect(handshakes).toBe(1)
})

test('reports torrents in error as a warning', async () => {
	torrents.push({error: 3, errorString: 'No data found! Ensure your drives are connected'})
	expect(await transmission({name: 'Transmission', url}).check!()).toEqual([{level: 'warning', message: '1 torrent(s) in error: No data found! Ensure your drives are connected'}])
})

test('is not configured without a URL', () => {
	expect(transmission({name: 'Transmission'}).check).toBeNull()
})
