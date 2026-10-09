import {formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Source} from '../types'

export type CleanuparrStats = {strikes: number; removed: number; cleaned: number; windowHours: number}

type Health = {name: string; isHealthy: boolean; errorMessage?: string | null}

type Stats = {
	strikes: {total: number}
	removals: {total: number}
	cleaned: {total: number}
	health: {downloadClients: Health[]; arrInstances: Health[]}
}

type Config = {name: string; url?: string; apiKey?: string; windowHours?: number}

export function cleanuparr({name, url, apiKey, windowHours = 24}: Config): Source<CleanuparrStats> {
	const facts = (data: CleanuparrStats) => [
		{label: `Strikes, ${data.windowHours} h`, value: formatCount(data.strikes)},
		{label: 'Removed', value: formatCount(data.removed)},
		{label: 'Cleaned', value: formatCount(data.cleaned)},
	]
	if (!url || !apiKey) return {name, read: null, facts, setup: keySetup(name, url)}

	const api = apiClient(`${url}/api/v2`, {'X-Api-Key': apiKey})

	return {
		name,
		facts,
		async read() {
			const {strikes, removals, cleaned, health} = await api<Stats>('/stats', {hours: String(windowHours)})
			return {
				data: {strikes: strikes.total, removed: removals.total, cleaned: cleaned.total, windowHours},
				issues: [...health.downloadClients, ...health.arrInstances]
					.filter(({isHealthy}) => !isHealthy)
					.map(({name: client, errorMessage}) => ({level: 'warning' as const, message: `${client}: ${errorMessage ?? 'unhealthy'}`})),
			}
		},
	}
}
