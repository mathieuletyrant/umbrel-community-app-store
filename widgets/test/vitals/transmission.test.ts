import {afterAll, beforeEach, expect, test} from 'bun:test'

import {transmission} from '../../src/vitals/sources/transmission'

let handshakes = 0
let torrents: {status: number; error: number; errorString: string}[] = []

const rpc = Bun.serve({
	port: 0,
	async fetch(request) {
		if (request.headers.get('x-transmission-session-id') !== 'session-1') {
			handshakes++
			return new Response('Conflict', {status: 409, headers: {'X-Transmission-Session-Id': 'session-1'}})
		}
		const {method} = (await request.json()) as {method: string}
		if (method === 'torrent-get') return Response.json({result: 'success', arguments: {torrents}})
		if (method === 'session-stats') return Response.json({result: 'success', arguments: {downloadSpeed: 4_200_000, uploadSpeed: 120_000}})
		return Response.json({result: 'method name not recognized', arguments: {}})
	},
})
afterAll(() => rpc.stop())

const url = `http://localhost:${rpc.port}/transmission/rpc`

beforeEach(() => {
	handshakes = 0
	torrents = [
		{status: 4, error: 0, errorString: ''},
		{status: 3, error: 0, errorString: ''},
		{status: 6, error: 0, errorString: ''},
		{status: 0, error: 0, errorString: ''},
	]
})

test('counts torrents by activity and reads the speeds, after the session handshake', async () => {
	const source = transmission({name: 'Transmission', url})

	expect(await source.read!()).toEqual({
		data: {downloading: 2, seeding: 1, paused: 1, downloadSpeed: 4_200_000, uploadSpeed: 120_000},
		issues: [],
	})
	await source.read!()
	expect(handshakes).toBeLessThanOrEqual(2)
})

test('reports torrents in error as a warning', async () => {
	torrents.push({status: 0, error: 3, errorString: 'No data found! Ensure your drives are connected'})
	const {issues} = await transmission({name: 'Transmission', url}).read!()
	expect(issues).toEqual([{level: 'warning', message: '1 torrent(s) in error: No data found! Ensure your drives are connected'}])
})

test('is not configured without a URL', () => {
	expect(transmission({name: 'Transmission'}).read).toBeNull()
})

test('describes its data with readable speeds', () => {
	const {facts} = transmission({name: 'Transmission'})
	expect(facts({downloading: 2, seeding: 10, paused: 0, downloadSpeed: 4_200_000, uploadSpeed: 950})).toEqual([
		{label: 'Downloading', value: '2'},
		{label: 'Seeding', value: '10'},
		{label: 'Down', value: '4.2 MB/s'},
		{label: 'Up', value: '950 B/s'},
	])
})
