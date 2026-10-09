import type {Issue, Source} from '../src/types'

export const fake = <T>(name: string, data: T, issues: Issue[] = []): Source<T> => ({
	name,
	read: async () => ({data, issues}),
	facts: () => [],
})

export const failing = (name: string, message: string): Source<unknown> => ({
	name,
	read: async () => {
		throw new Error(message)
	},
	facts: () => [],
})

export const absent = (name: string): Source<unknown> => ({name, read: null, facts: () => []})

// A fake app API: answers each path with its JSON, only when the given header carries the right value.
export function fakeApi(routes: Record<string, unknown>, auth?: {header: string; value: string}) {
	const server = Bun.serve({
		port: 0,
		fetch(request) {
			if (auth && request.headers.get(auth.header) !== auth.value) return new Response('Unauthorized', {status: 401})
			const {pathname} = new URL(request.url)
			return pathname in routes ? Response.json(routes[pathname]) : new Response('Not found', {status: 404})
		},
	})
	return {url: `http://localhost:${server.port}`, stop: () => server.stop()}
}
