import {formatCount, formatSpeed} from '../../core/format'
import {HttpError, request} from '../../core/http'
import type {Issue, Source} from '../types'

export type TransmissionStats = {
	downloading: number
	seeding: number
	paused: number
	downloadSpeed: number
	uploadSpeed: number
}

type Config = {name: string; url?: string}

// https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md (tr_torrent_activity)
const STOPPED = 0
const DOWNLOADING = new Set([3, 4])
const SEEDING = new Set([5, 6])

const SESSION_HEADER = 'X-Transmission-Session-Id'

export function transmission({name, url}: Config): Source<TransmissionStats> {
	const facts = (data: TransmissionStats) => [
		{label: 'Downloading', value: formatCount(data.downloading)},
		{label: 'Seeding', value: formatCount(data.seeding)},
		{label: 'Down', value: formatSpeed(data.downloadSpeed)},
		{label: 'Up', value: formatSpeed(data.uploadSpeed)},
	]
	if (!url) return {name, read: null, facts}

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
		facts,
		async read() {
			const [{torrents}, stats] = await Promise.all([
				rpc<{torrents: {status: number; error: number; errorString: string}[]}>('torrent-get', {
					fields: ['status', 'error', 'errorString'],
				}),
				rpc<{downloadSpeed: number; uploadSpeed: number}>('session-stats'),
			])
			const failing = torrents.filter((torrent) => torrent.error !== 0)
			const issues: Issue[] = failing.length
				? [{level: 'warning', message: `${failing.length} torrent(s) in error: ${failing[0]!.errorString}`}]
				: []
			return {
				data: {
					downloading: torrents.filter(({status}) => DOWNLOADING.has(status)).length,
					seeding: torrents.filter(({status}) => SEEDING.has(status)).length,
					paused: torrents.filter(({status}) => status === STOPPED).length,
					downloadSpeed: stats.downloadSpeed,
					uploadSpeed: stats.uploadSpeed,
				},
				issues,
			}
		},
	}
}
