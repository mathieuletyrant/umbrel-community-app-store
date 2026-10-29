import {afterAll, expect, test} from 'bun:test'

import {arr} from '../src/sources/arr'
import {fakeApi} from './fixtures'

const health = [
	{type: 'notice', message: 'Update available'},
	{type: 'warning', message: 'Indexers unavailable due to failures'},
	{type: 'error', message: 'Download client is unavailable'},
]
const radarr = fakeApi({'/api/v3/health': health}, {header: 'x-api-key', value: 'radarr-key'})
const prowlarr = fakeApi({'/api/v1/health': [{type: 'error', message: 'All indexers are unavailable due to failures'}]}, {
	header: 'x-api-key',
	value: 'prowlarr-key',
})
afterAll(() => {
	radarr.stop()
	prowlarr.stop()
})

test('turns warnings and errors of the health checks into issues, not notices', async () => {
	expect(await arr({name: 'Radarr', url: radarr.url, apiKey: 'radarr-key'}).check!()).toEqual([
		{level: 'warning', message: 'Indexers unavailable due to failures'},
		{level: 'error', message: 'Download client is unavailable'},
	])
})

test('reads Prowlarr on its v1 API', async () => {
	expect(await arr({name: 'Prowlarr', url: prowlarr.url, apiKey: 'prowlarr-key', apiPath: '/api/v1'}).check!()).toEqual([
		{level: 'error', message: 'All indexers are unavailable due to failures'},
	])
})

test('fails on a wrong API key', async () => {
	await expect(arr({name: 'Radarr', url: radarr.url, apiKey: 'wrong'}).check!()).rejects.toThrow('HTTP 401')
})

test('is not configured without a URL or an API key', () => {
	expect(arr({name: 'Radarr', url: radarr.url}).check).toBeNull()
	expect(arr({name: 'Radarr', apiKey: 'radarr-key'}).check).toBeNull()
})
