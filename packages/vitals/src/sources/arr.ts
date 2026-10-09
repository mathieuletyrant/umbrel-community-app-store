import {formatCount} from '@mathieu/core/format'
import {getJson} from '@mathieu/core/http'

import type {Issue, Source} from '../types'

export type ArrStats = {
	queue: number
	missing: number
	upcoming: number
	upcomingDays: number
}

type Config = {
	name: string
	url?: string
	apiKey?: string
	upcomingDays: number
	now?: () => Date
}

type Health = {type: 'ok' | 'notice' | 'warning' | 'error'; message: string}[]

const DAY_MS = 86_400_000

// Radarr and Sonarr share the v3 API for everything Vitals reads.
export function arr({name, url, apiKey, upcomingDays, now = () => new Date()}: Config): Source<ArrStats> {
	const facts = (data: ArrStats) => [
		{label: 'Queue', value: formatCount(data.queue)},
		{label: 'Missing', value: formatCount(data.missing)},
		{label: `Next ${data.upcomingDays} days`, value: formatCount(data.upcoming)},
	]
	if (!url || !apiKey) return {name, read: null, facts}

	const get = <T>(path: string, params: Record<string, string> = {}) =>
		getJson<T>(`${url}/api/v3/${path}?${new URLSearchParams(params)}`, {'X-Api-Key': apiKey})

	return {
		name,
		facts,
		async read() {
			const start = now()
			const [queue, missing, upcoming, health] = await Promise.all([
				get<{totalCount: number}>('queue/status'),
				get<{totalRecords: number}>('wanted/missing', {page: '1', pageSize: '1', monitored: 'true'}),
				get<unknown[]>('calendar', {
					start: start.toISOString(),
					end: new Date(start.getTime() + upcomingDays * DAY_MS).toISOString(),
				}),
				get<Health>('health'),
			])
			return {
				data: {queue: queue.totalCount, missing: missing.totalRecords, upcoming: upcoming.length, upcomingDays},
				issues: health.flatMap(({type, message}): Issue[] =>
					type === 'warning' || type === 'error' ? [{level: type, message}] : [],
				),
			}
		},
	}
}
