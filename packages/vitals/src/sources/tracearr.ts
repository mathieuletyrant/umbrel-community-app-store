import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Source} from '../types'

type Health = {servers: {name: string; online: boolean; historical: boolean}[]}

type Config = {name: string; url?: string; apiKey?: string}

export function tracearr({name, url, apiKey}: Config): Source {
	if (!url || !apiKey) return {name, check: null, setup: keySetup(name, url)}

	const api = apiClient(`${url}/api/v1/public`, {Authorization: `Bearer ${apiKey}`})

	return {
		name,
		async check() {
			const {servers} = await api<Health>('/health')
			// A historical server is one Tracearr no longer contacts, kept for its history.
			return servers
				.filter(({online, historical}) => !online && !historical)
				.map(({name: server}) => ({level: 'warning' as const, message: `${server} is offline`}))
		},
	}
}
