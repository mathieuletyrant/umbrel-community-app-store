import {errorMessage} from '../core/http'
import type {App} from './types'

export function createHandler(app: App, log: (message: string) => void = console.error) {
	return async (request: Request): Promise<Response> => {
		const id = new URL(request.url).pathname.slice(1)
		const source = app[id]
		if (!source) return Response.json({error: `No widget named "${id}"`}, {status: 404})
		try {
			return Response.json(await source.read())
		} catch (error) {
			log(`${id}: ${errorMessage(error)}`)
			return Response.json(source.fallback)
		}
	}
}
