import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Issue, Source} from '../types'

type Config = {name: string; url?: string; apiKey?: string; apiPath?: string}

type Health = {type: 'ok' | 'notice' | 'warning' | 'error'; message: string}[]

// Radarr, Sonarr (/api/v3) and Prowlarr (/api/v1) share the same health checks: warnings and errors become issues, notices don't.
export function arr({name, url, apiKey, apiPath = '/api/v3'}: Config): Source {
	if (!url || !apiKey) return {name, check: null, setup: keySetup(name, url)}

	const api = apiClient(`${url}${apiPath}`, {'X-Api-Key': apiKey})

	return {
		name,
		async check() {
			const health = await api<Health>('/health')
			return health.flatMap(({type, message}): Issue[] => (type === 'warning' || type === 'error' ? [{level: type, message}] : []))
		},
	}
}
