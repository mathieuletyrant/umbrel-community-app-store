import {expect, test} from 'bun:test'

import {createApiHandler} from '../src/api'
import {createSummary} from '../src/summary'
import {absent, fake} from './fixtures'

const sources = {
	radarr: fake('Radarr'),
	sonarr: absent('Sonarr'),
	bazarr: fake('Bazarr', [{level: 'warning', message: 'Path does not exist'}]),
	prowlarr: fake('Prowlarr', [{level: 'error', message: 'All indexers are unavailable'}]),
}
const handler = createApiHandler({sources, summary: createSummary(sources), token: 'secret'})
const get = (path: string, token?: string) =>
	handler(new Request(`http://vitals${path}`, {headers: token ? {Authorization: `Bearer ${token}`} : {}}))

test('serves the summary to a client with the bearer token', async () => {
	const response = await get('/v1/summary', 'secret')
	expect(response.status).toBe(200)
	expect(response.headers.get('cache-control')).toBe('no-store')
	expect(await response.json()).toMatchObject({version: 2, healthy: false, apps: {radarr: {status: 'ok', issues: []}}})
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
	expect(html).toContain('Not set up')
	expect(html).toContain('<span class="pill warn">Warning</span>')
	expect(html).toContain('<span class="pill bad">Needs attention</span>')
	expect(html).toContain('<li class="error">All indexers are unavailable</li>')
	expect(await (await get('/health')).json()).toEqual({status: 'ok'})
})

test('only answers GET', async () => {
	const response = await handler(new Request('http://vitals/v1/summary', {method: 'POST', headers: {Authorization: 'Bearer secret'}}))
	expect(response.status).toBe(405)
})
