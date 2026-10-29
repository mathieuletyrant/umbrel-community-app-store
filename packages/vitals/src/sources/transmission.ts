import {HttpError, request} from '@mathieu/core/http'

import type {Source} from '../types'

type Config = {name: string; url?: string}

const SESSION_HEADER = 'X-Transmission-Session-Id'

export function transmission({name, url}: Config): Source {
	if (!url) return {name, check: null}

	let session = ''

	// Transmission answers 409 with a fresh session id until the request carries it.
	async function rpc<T>(method: string, args: object = {}): Promise<T> {
		const send = () =>
			request(url!, {
				method: 'POST',
				headers: {[SESSION_HEADER]: session, 'Content-Type': 'application/json'},
				body: JSON.stringify({method, arguments: args}),
			})
		let response: Response
		try {
			response = await send()
		} catch (error) {
			if (!(error instanceof HttpError && error.status === 409)) throw error
			session = error.headers.get(SESSION_HEADER) ?? ''
			response = await send()
		}
		const body = (await response.json()) as {result: string; arguments: T}
		if (body.result !== 'success') throw new Error(`Transmission ${method}: ${body.result}`)
		return body.arguments
	}

	return {
		name,
		async check() {
			const {torrents} = await rpc<{torrents: {error: number; errorString: string}[]}>('torrent-get', {
				fields: ['error', 'errorString'],
			})
			const failing = torrents.filter((torrent) => torrent.error !== 0)
			return failing.length ? [{level: 'warning', message: `${failing.length} torrent(s) in error: ${failing[0]!.errorString}`}] : []
		},
	}
}
