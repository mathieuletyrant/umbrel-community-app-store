import {afterAll, describe, expect, test} from 'bun:test'

import {bazarr} from '../src/sources/bazarr'
import {cleanuparr} from '../src/sources/cleanuparr'
import {healarr} from '../src/sources/healarr'
import {maintainerr} from '../src/sources/maintainerr'
import {prowlarr} from '../src/sources/prowlarr'
import {seerr} from '../src/sources/seerr'
import {tracearr} from '../src/sources/tracearr'
import {fakeApi} from './fixtures'

const now = new Date('2026-10-09T12:00:00Z')
const servers: {stop: () => void}[] = []
const serve = (...args: Parameters<typeof fakeApi>) => {
	const server = fakeApi(...args)
	servers.push(server)
	return server.url
}
afterAll(() => servers.forEach((server) => server.stop()))

describe('prowlarr', () => {
	const url = serve(
		{
			'/api/v1/indexer': [{enable: true}, {enable: true}, {enable: false}],
			'/api/v1/indexerstatus': [{disabledTill: '2026-10-09T13:00:00Z'}, {disabledTill: '2026-10-09T11:00:00Z'}, {}],
			'/api/v1/health': [{type: 'error', message: 'All indexers are unavailable due to failures'}],
		},
		{header: 'x-api-key', value: 'key'},
	)

	test('counts enabled and currently disabled indexers, and reports health', async () => {
		expect(await prowlarr({name: 'Prowlarr', url, apiKey: 'key', now: () => now}).read!()).toEqual({
			data: {indexers: 2, failing: 1},
			issues: [{level: 'error', message: 'All indexers are unavailable due to failures'}],
		})
	})

	test('fails on a wrong key, and is not configured without one', async () => {
		await expect(prowlarr({name: 'Prowlarr', url, apiKey: 'wrong'}).read!()).rejects.toThrow('HTTP 401')
		expect(prowlarr({name: 'Prowlarr', url}).read).toBeNull()
	})
})

test('bazarr reads missing subtitles and throttled providers, and turns health issues into warnings', async () => {
	const url = serve(
		{
			'/api/badges': {episodes: 12, movies: 3, providers: 1, status: 1},
			'/api/system/health': {data: [{object: '/downloads/shows', issue: 'Path does not exist'}]},
		},
		{header: 'x-api-key', value: 'key'},
	)
	expect(await bazarr({name: 'Bazarr', url, apiKey: 'key'}).read!()).toEqual({
		data: {missingEpisodes: 12, missingMovies: 3, throttledProviders: 1},
		issues: [{level: 'warning', message: '/downloads/shows: Path does not exist'}],
	})
})

test('seerr reads its request counts', async () => {
	const url = serve(
		{'/api/v1/request/count': {total: 40, movie: 25, tv: 15, pending: 3, approved: 30, declined: 2, processing: 4, available: 31, completed: 31}},
		{header: 'x-api-key', value: 'key'},
	)
	expect(await seerr({name: 'Seerr', url, apiKey: 'key'}).read!()).toEqual({
		data: {pending: 3, processing: 4, available: 31, total: 40},
		issues: [],
	})
})

test('maintainerr needs no key, and reports unreachable *arr instances', async () => {
	const url = serve({
		'/api/storage-metrics': {
			instances: [
				{name: 'Radarr', ok: true, error: null},
				{name: 'Sonarr', ok: false, error: 'connect ECONNREFUSED'},
			],
			collectionSummary: {reclaimableCount: 18, activeSizeBytes: 412_000_000_000},
			cleanupTotals: {itemsHandled: 128},
		},
	})
	const source = maintainerr({name: 'Maintainerr', url})
	const reading = await source.read!()
	expect(reading).toEqual({
		data: {reclaimableItems: 18, reclaimableBytes: 412_000_000_000, itemsHandled: 128},
		issues: [{level: 'warning', message: 'Sonarr: connect ECONNREFUSED'}],
	})
	expect(source.facts(reading.data)[0]).toEqual({label: 'To reclaim', value: '412 GB'})
})

test('healarr reads its dashboard and warns about files waiting for a fix', async () => {
	const url = serve(
		{
			'/api/stats/dashboard': {
				files_scanned_today: 2418,
				pending_corruptions: 3,
				manual_intervention_corruptions: 1,
				successful_remediations: 41,
			},
		},
		{header: 'x-api-key', value: 'key'},
	)
	expect(await healarr({name: 'Healarr', url, apiKey: 'key'}).read!()).toEqual({
		data: {scannedToday: 2418, corrupted: 3, needsAttention: 1, repaired: 41},
		issues: [
			{level: 'warning', message: '3 corrupted file(s) waiting for repair'},
			{level: 'warning', message: '1 file(s) need a manual fix'},
		],
	})
})

test('cleanuparr reads the last 24 hours and reports unhealthy clients', async () => {
	const url = serve(
		{
			'/api/v2/stats': {
				strikes: {total: 54},
				removals: {total: 12},
				cleaned: {total: 9},
				health: {
					downloadClients: [{name: 'Transmission', isHealthy: false, errorMessage: 'timeout'}],
					arrInstances: [{name: 'Radarr', isHealthy: true}],
				},
			},
		},
		{header: 'x-api-key', value: 'key'},
	)
	expect(await cleanuparr({name: 'Cleanuparr', url, apiKey: 'key'}).read!()).toEqual({
		data: {strikes: 54, removed: 12, cleaned: 9, windowHours: 24},
		issues: [{level: 'warning', message: 'Transmission: timeout'}],
	})
})

test('tracearr reads the stream summary with its bearer token', async () => {
	const url = serve(
		{
			'/api/v1/public/streams': {
				summary: {total: 3, transcodes: 1, directStreams: 0, directPlays: 2, totalBitrate: '24.3 Mbps'},
			},
		},
		{header: 'authorization', value: 'Bearer trr_pub_token'},
	)
	expect(await tracearr({name: 'Tracearr', url, apiKey: 'trr_pub_token'}).read!()).toEqual({
		data: {streams: 3, transcodes: 1, directPlays: 2, directStreams: 0, bitrate: '24.3 Mbps'},
		issues: [],
	})
})

test('every app needing a key is not configured without one', () => {
	for (const make of [bazarr, seerr, healarr, cleanuparr, tracearr]) {
		expect(make({name: 'App', url: 'http://app'}).read).toBeNull()
	}
	expect(maintainerr({name: 'Maintainerr'}).read).toBeNull()
})

test('an installed app missing its key says where to paste it', () => {
	expect(healarr({name: 'Healarr', url: 'http://healarr'}).setup).toBe(
		"Paste Healarr's API key in Vitals' settings in umbrelOS, then restart Vitals.",
	)
	expect(healarr({name: 'Healarr'}).setup).toBeUndefined()
})
