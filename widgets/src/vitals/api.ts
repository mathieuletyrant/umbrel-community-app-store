import {timingSafeEqual} from 'node:crypto'

import {renderPage} from './page'
import type {Sources, Summary} from './types'

type Options<S extends Sources> = {
	sources: S
	summary: () => Promise<Summary<S>>
	token: string
}

const noStore = {'Cache-Control': 'no-store'}

export function createApiHandler<S extends Sources>({sources, summary, token}: Options<S>) {
	const expected = Buffer.from(`Bearer ${token}`)
	const authorized = (request: Request) => {
		const given = Buffer.from(request.headers.get('authorization') ?? '')
		return given.length === expected.length && timingSafeEqual(given, expected)
	}

	return async (request: Request): Promise<Response> => {
		const {pathname} = new URL(request.url)
		if (request.method !== 'GET') return Response.json({error: 'Method not allowed'}, {status: 405})

		if (pathname === '/health') return Response.json({status: 'ok'})
		// Reached through app_proxy, so behind the Umbrel login.
		if (pathname === '/') {
			return new Response(renderPage(sources, await summary()), {
				headers: {'Content-Type': 'text/html; charset=utf-8', ...noStore},
			})
		}

		if (!pathname.startsWith('/v1/')) return Response.json({error: 'Not found'}, {status: 404})
		if (!authorized(request)) return Response.json({error: 'Missing or wrong bearer token'}, {status: 401})

		if (pathname === '/v1/summary') return Response.json(await summary(), {headers: noStore})
		const app = pathname.match(/^\/v1\/apps\/([a-z0-9-]+)$/)?.[1]
		if (app && app in sources) return Response.json((await summary()).apps[app], {headers: noStore})
		return Response.json({error: 'Not found'}, {status: 404})
	}
}
