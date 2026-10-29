import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Source} from '../types'

type Config = {name: string; url?: string; apiKey?: string}

// Seerr, Jellyseerr and Overseerr have no health checks: Seerr is healthy when it answers, with a valid key.
export function seerr({name, url, apiKey}: Config): Source {
	if (!url || !apiKey) return {name, check: null, setup: keySetup(name, url)}

	const api = apiClient(`${url}/api/v1`, {'X-Api-Key': apiKey})

	return {
		name,
		async check() {
			await api('/auth/me')
			return []
		},
	}
}
