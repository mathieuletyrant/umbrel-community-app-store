import type {App} from './umbrel'

export function createHandler(app: App, log: (message: string) => void = console.error) {
	return async (request: Request): Promise<Response> => {
		const id = new URL(request.url).pathname.slice(1)
		const source = app[id]
		if (!source) return Response.json({error: `No widget named "${id}"`}, {status: 404})
		try {
			return Response.json(await source.read())
		} catch (error) {
			log(`${id}: ${error instanceof Error ? error.message : String(error)}`)
			return Response.json(source.fallback)
		}
	}
}
