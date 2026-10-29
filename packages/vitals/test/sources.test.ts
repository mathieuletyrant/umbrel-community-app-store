import {afterAll, expect, test} from 'bun:test'

import {arr} from '../src/sources/arr'
import {bazarr} from '../src/sources/bazarr'
import {cleanuparr} from '../src/sources/cleanuparr'
import {healarr} from '../src/sources/healarr'
import {maintainerr} from '../src/sources/maintainerr'
import {seerr} from '../src/sources/seerr'
import {tracearr} from '../src/sources/tracearr'
import {fakeApi} from './fixtures'

const servers: {stop: () => void}[] = []
const serve = (...args: Parameters<typeof fakeApi>) => {
	const server = fakeApi(...args)
	servers.push(server)
	return server.url
}
afterAll(() => servers.forEach((server) => server.stop()))

test('bazarr turns its health issues into warnings', async () => {
	const url = serve(
		{'/api/system/health': {data: [{object: '/downloads/shows', issue: 'Path does not exist'}]}},
		{header: 'x-api-key', value: 'key'},
	)
	expect(await bazarr({name: 'Bazarr', url, apiKey: 'key'}).check!()).toEqual([
		{level: 'warning', message: '/downloads/shows: Path does not exist'},
	])
})

test('seerr is healthy when it answers with a valid key', async () => {
	const url = serve({'/api/v1/auth/me': {id: 1, displayName: 'admin'}}, {header: 'x-api-key', value: 'key'})
	expect(await seerr({name: 'Seerr', url, apiKey: 'key'}).check!()).toEqual([])
	await expect(seerr({name: 'Seerr', url, apiKey: 'wrong'}).check!()).rejects.toThrow('HTTP 401')
})

test('maintainerr needs no key and reports unreachable *arr instances', async () => {
	const url = serve({
		'/api/storage-metrics': {
			instances: [
				{name: 'Radarr', ok: true, error: null},
				{name: 'Sonarr', ok: false, error: 'connect ECONNREFUSED'},
			],
		},
	})
	expect(await maintainerr({name: 'Maintainerr', url}).check!()).toEqual([{level: 'warning', message: 'Sonarr: connect ECONNREFUSED'}])
})

test('healarr warns about files waiting for a fix', async () => {
	const url = serve(
		{'/api/stats/dashboard': {files_scanned_today: 2418, pending_corruptions: 3, manual_intervention_corruptions: 1}},
		{header: 'x-api-key', value: 'key'},
	)
	expect(await healarr({name: 'Healarr', url, apiKey: 'key'}).check!()).toEqual([
		{level: 'warning', message: '3 corrupted file(s) waiting for repair'},
		{level: 'warning', message: '1 file(s) need a manual fix'},
	])
})

test('cleanuparr reports unhealthy clients', async () => {
	const url = serve(
		{
			'/api/v2/stats': {
				strikes: {total: 54},
				health: {
					downloadClients: [{name: 'Transmission', isHealthy: false, errorMessage: 'timeout'}],
					arrInstances: [{name: 'Radarr', isHealthy: true}],
				},
			},
		},
		{header: 'x-api-key', value: 'key'},
	)
	expect(await cleanuparr({name: 'Cleanuparr', url, apiKey: 'key'}).check!()).toEqual([{level: 'warning', message: 'Transmission: timeout'}])
})

test('tracearr reports offline media servers, with its bearer token', async () => {
	const url = serve(
		{
			'/api/v1/public/health': {
				status: 'ok',
				servers: [
					{name: 'Plex', online: true, historical: false},
					{name: 'Jellyfin', online: false, historical: false},
					{name: 'Old Emby', online: false, historical: true},
				],
			},
		},
		{header: 'authorization', value: 'Bearer trr_pub_token'},
	)
	expect(await tracearr({name: 'Tracearr', url, apiKey: 'trr_pub_token'}).check!()).toEqual([
		{level: 'warning', message: 'Jellyfin is offline'},
	])
})

test('every app needing a key is not configured without one', () => {
	for (const make of [bazarr, seerr, healarr, cleanuparr, tracearr]) {
		expect(make({name: 'App', url: 'http://app'}).check).toBeNull()
	}
	expect(maintainerr({name: 'Maintainerr'}).check).toBeNull()
})

test('an installed app missing its key says where to paste it', () => {
	expect(healarr({name: 'Healarr', url: 'http://healarr'}).setup).toBe("Paste Healarr's API key in Vitals' settings in umbrelOS.")
	expect(healarr({name: 'Healarr'}).setup).toBeUndefined()
	expect(arr({name: 'Radarr', url: 'http://radarr'}).setup).toBe("Paste Radarr's API key in Vitals' settings in umbrelOS.")
})
