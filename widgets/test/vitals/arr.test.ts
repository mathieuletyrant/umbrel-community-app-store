import {afterAll, expect, test} from 'bun:test'

import {arr} from '../../src/vitals/sources/arr'

const now = new Date('2026-10-09T12:00:00Z')
const seen: URL[] = []

const radarr = Bun.serve({
	port: 0,
	fetch(request) {
		if (request.headers.get('x-api-key') !== 'radarr-key') return new Response('Unauthorized', {status: 401})
		const url = new URL(request.url)
		seen.push(url)
		switch (url.pathname) {
			case '/api/v3/queue/status':
				return Response.json({totalCount: 2, count: 2, errors: false, warnings: false})
			case '/api/v3/wanted/missing':
				return Response.json({page: 1, pageSize: 1, totalRecords: 14, records: [{}]})
			case '/api/v3/calendar':
				return Response.json([{}, {}, {}])
			case '/api/v3/health':
				return Response.json([
					{type: 'notice', message: 'Update available'},
					{type: 'warning', message: 'Indexers unavailable due to failures'},
					{type: 'error', message: 'Download client is unavailable'},
				])
		}
		return new Response('Not found', {status: 404})
	},
})
afterAll(() => radarr.stop())

const url = `http://localhost:${radarr.port}`

test('reads queue, missing, upcoming and health issues', async () => {
	const source = arr({name: 'Radarr', url, apiKey: 'radarr-key', upcomingDays: 30, now: () => now})

	expect(await source.read!()).toEqual({
		data: {queue: 2, missing: 14, upcoming: 3, upcomingDays: 30},
		issues: [
			{level: 'warning', message: 'Indexers unavailable due to failures'},
			{level: 'error', message: 'Download client is unavailable'},
		],
	})
	const calendar = seen.find(({pathname}) => pathname === '/api/v3/calendar')!
	expect(calendar.searchParams.get('start')).toBe('2026-10-09T12:00:00.000Z')
	expect(calendar.searchParams.get('end')).toBe('2026-11-08T12:00:00.000Z')
	expect(seen.find(({pathname}) => pathname === '/api/v3/wanted/missing')!.searchParams.get('monitored')).toBe('true')
})

test('fails on a wrong API key', async () => {
	const source = arr({name: 'Radarr', url, apiKey: 'wrong', upcomingDays: 30})
	await expect(source.read!()).rejects.toThrow('HTTP 401')
})

test('is not configured without a URL or an API key', () => {
	expect(arr({name: 'Radarr', url, upcomingDays: 30}).read).toBeNull()
	expect(arr({name: 'Radarr', apiKey: 'radarr-key', upcomingDays: 30}).read).toBeNull()
})

test('describes its data as facts', () => {
	const {facts} = arr({name: 'Sonarr', upcomingDays: 7})
	expect(facts({queue: 1200, missing: 3, upcoming: 9, upcomingDays: 7})).toEqual([
		{label: 'Queue', value: '1,200'},
		{label: 'Missing', value: '3'},
		{label: 'Next 7 days', value: '9'},
	])
})
