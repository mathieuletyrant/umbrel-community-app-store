import {expect, test} from 'bun:test'

import {createSummary} from '../../src/vitals/summary'
import {absent, failing, fake} from './fixtures'

const now = new Date('2026-10-09T12:00:00Z')

test('reports each app, and is healthy while no app is down or has an error-level issue', async () => {
	const summary = createSummary(
		{
			radarr: fake('Radarr', {queue: 1}, [{level: 'warning', message: 'Indexer slow'}]),
			sonarr: absent('Sonarr'),
		},
		{now: () => now},
	)

	expect(await summary()).toEqual({
		version: 1,
		generatedAt: '2026-10-09T12:00:00.000Z',
		healthy: true,
		apps: {
			radarr: {name: 'Radarr', status: 'ok', healthy: true, issues: [{level: 'warning', message: 'Indexer slow'}], data: {queue: 1}},
			sonarr: {name: 'Sonarr', status: 'not-configured', healthy: null},
		},
	})
})

test('is unhealthy when an app has an error-level issue', async () => {
	const summary = createSummary({radarr: fake('Radarr', {}, [{level: 'error', message: 'Download client is unavailable'}])})
	const {healthy, apps} = await summary()
	expect(healthy).toBe(false)
	expect(apps.radarr.healthy).toBe(false)
})

test('isolates an app that fails, and reports why', async () => {
	const summary = createSummary({radarr: fake('Radarr', {queue: 0}), transmission: failing('Transmission', 'connect ECONNREFUSED')})
	const {healthy, apps} = await summary()
	expect(healthy).toBe(false)
	expect(apps.radarr.status).toBe('ok')
	expect(apps.transmission).toEqual({name: 'Transmission', status: 'error', healthy: false, error: 'connect ECONNREFUSED'})
})

test('asks the apps at most once per cache window', async () => {
	let reads = 0
	let clock = now.getTime()
	const summary = createSummary(
		{radarr: {name: 'Radarr', read: async () => ({data: ++reads, issues: []}), facts: () => []}},
		{cacheMs: 10_000, now: () => new Date(clock)},
	)
	await summary()
	clock += 9_999
	await summary()
	expect(reads).toBe(1)
	clock += 1
	await summary()
	expect(reads).toBe(2)
})
