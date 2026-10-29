import {apiClient} from '@mathieu/core/http'

import type {Source} from '../types'

type StorageMetrics = {instances: {name: string; ok: boolean; error: string | null}[]}

type Config = {name: string; url?: string}

// Maintainerr has no API key: the Umbrel login guards it, and Vitals reaches it on the Docker network.
export function maintainerr({name, url}: Config): Source {
	if (!url) return {name, check: null}

	const api = apiClient(`${url}/api`)

	return {
		name,
		async check() {
			const {instances} = await api<StorageMetrics>('/storage-metrics')
			return instances
				.filter(({ok}) => !ok)
				.map(({name: instance, error}) => ({level: 'warning' as const, message: `${instance}: ${error ?? 'unreachable'}`}))
		},
	}
}
