import {expect, test} from 'bun:test'

import {createApiHandler} from '../../src/vitals/api'
import {createSummary} from '../../src/vitals/summary'
import {absent, fake} from './fixtures'

const sources = {radarr: fake('Radarr', {queue: 2}), sonarr: absent('Sonarr')}
const handler = createApiHandler({sources, summary: createSummary(sources), token: 'secret'})
const get = (path: string, token?: string) =>
	handler(new Request(`http://vitals${path}`, {headers: token ? {Authorization: `Bearer ${token}`} : {}}))

test('serves the summary to a client with the bearer token', async () => {
	const response = await get('/v1/summary', 'secret')
	expect(response.status).toBe(200)
	expect(response.headers.get('cache-control')).toBe('no-store')
	expect(await response.json()).toMatchObject({version: 1, healthy: true, apps: {radarr: {status: 'ok', data: {queue: 2}}}})
})

test('serves one app', async () => {
	expect(await (await get('/v1/apps/sonarr', 'secret')).json()).toEqual({name: 'Sonarr', status: 'not-configured', healthy: null})
	expect((await get('/v1/apps/plex', 'secret')).status).toBe(404)
})

test('refuses the API without the right token', async () => {
	expect((await get('/v1/summary')).status).toBe(401)
	expect((await get('/v1/summary', 'wrong')).status).toBe(401)
	expect((await get('/v1/apps/radarr', 'secre')).status).toBe(401)
})

test('serves the status page and a liveness check without a token', async () => {
	const page = await get('/')
	expect(page.headers.get('content-type')).toStartWith('text/html')
	const html = await page.text()
	expect(html).toContain('<h2>Radarr</h2>')
	expect(html).toContain('Not installed')
	expect(await (await get('/health')).json()).toEqual({status: 'ok'})
})

test('only answers GET', async () => {
	const response = await handler(new Request('http://vitals/v1/summary', {method: 'POST', headers: {Authorization: 'Bearer secret'}}))
	expect(response.status).toBe(405)
})
