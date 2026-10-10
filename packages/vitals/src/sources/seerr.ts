import {formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Source} from '../types'

export type SeerrStats = {pending: number; processing: number; available: number; total: number}

type Config = {name: string; url?: string; apiKey?: string}

// Seerr, Jellyseerr and Overseerr share this API.
export function seerr({name, url, apiKey}: Config): Source<SeerrStats> {
	const facts = (data: SeerrStats) => [
		{label: 'Pending', value: formatCount(data.pending)},
		{label: 'Processing', value: formatCount(data.processing)},
		{label: 'Available', value: formatCount(data.available)},
	]
	if (!url || !apiKey) return {name, read: null, facts, setup: keySetup(name, url)}

	const api = apiClient(`${url}/api/v1`, {'X-Api-Key': apiKey})

	return {
		name,
		facts,
		async read() {
			const {pending, processing, available, total} = await api<SeerrStats>('/request/count')
			return {data: {pending, processing, available, total}, issues: []}
		},
	}
}
