import {formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

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

export type ArrHealth = {type: 'ok' | 'notice' | 'warning' | 'error'; message: string}[]

const DAY_MS = 86_400_000

// The *arr apps' own health checks: warnings and errors become issues, notices don't.
export const arrIssues = (health: ArrHealth): Issue[] =>
	health.flatMap(({type, message}): Issue[] => (type === 'warning' || type === 'error' ? [{level: type, message}] : []))

// Radarr and Sonarr share the v3 API for everything Vitals reads.
export function arr({name, url, apiKey, upcomingDays, now = () => new Date()}: Config): Source<ArrStats> {
	const facts = (data: ArrStats) => [
		{label: 'Queue', value: formatCount(data.queue)},
		{label: 'Missing', value: formatCount(data.missing)},
		{label: `Next ${data.upcomingDays} days`, value: formatCount(data.upcoming)},
	]
	if (!url || !apiKey) return {name, read: null, facts}

	const api = apiClient(`${url}/api/v3`, {'X-Api-Key': apiKey})

	return {
		name,
		facts,
		async read() {
			const start = now()
			const [queue, missing, upcoming, health] = await Promise.all([
				api<{totalCount: number}>('/queue/status'),
				api<{totalRecords: number}>('/wanted/missing', {page: '1', pageSize: '1', monitored: 'true'}),
				api<unknown[]>('/calendar', {
					start: start.toISOString(),
					end: new Date(start.getTime() + upcomingDays * DAY_MS).toISOString(),
				}),
				api<ArrHealth>('/health'),
			])
			return {
				data: {queue: queue.totalCount, missing: missing.totalRecords, upcoming: upcoming.length, upcomingDays},
				issues: arrIssues(health),
			}
		},
	}
}
