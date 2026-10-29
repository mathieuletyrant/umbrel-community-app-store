import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Source} from '../types'

type Health = {name: string; isHealthy: boolean; errorMessage?: string | null}

type Config = {name: string; url?: string; apiKey?: string}

// Cleanuparr's stats carry the health of the download clients and *arr apps it is connected to.
export function cleanuparr({name, url, apiKey}: Config): Source {
	if (!url || !apiKey) return {name, check: null, setup: keySetup(name, url)}

	const api = apiClient(`${url}/api/v2`, {'X-Api-Key': apiKey})

	return {
		name,
		async check() {
			const {health} = await api<{health: {downloadClients: Health[]; arrInstances: Health[]}}>('/stats')
			return [...health.downloadClients, ...health.arrInstances]
				.filter(({isHealthy}) => !isHealthy)
				.map(({name: client, errorMessage}) => ({level: 'warning' as const, message: `${client}: ${errorMessage ?? 'unhealthy'}`}))
		},
	}
}
