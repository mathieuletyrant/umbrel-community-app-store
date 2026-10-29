import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Source} from '../types'

type Config = {name: string; url?: string; apiKey?: string}

export function bazarr({name, url, apiKey}: Config): Source {
	if (!url || !apiKey) return {name, check: null, setup: keySetup(name, url)}

	const api = apiClient(`${url}/api`, {'X-API-KEY': apiKey})

	return {
		name,
		async check() {
			const health = await api<{data: {object: string; issue: string}[]}>('/system/health')
			return health.data.map(({object, issue}) => ({level: 'warning' as const, message: `${object}: ${issue}`}))
		},
	}
}
