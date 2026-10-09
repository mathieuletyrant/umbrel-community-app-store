import {formatBytes, formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

import type {Source} from '../types'

export type MaintainerrStats = {reclaimableItems: number; reclaimableBytes: number; itemsHandled: number}

type StorageMetrics = {
	instances: {name: string; ok: boolean; error: string | null}[]
	collectionSummary: {reclaimableCount: number; activeSizeBytes: number}
	cleanupTotals: {itemsHandled: number}
}

type Config = {name: string; url?: string}

// Maintainerr has no API key: the Umbrel login guards it, and Vitals reaches it on the Docker network.
export function maintainerr({name, url}: Config): Source<MaintainerrStats> {
	const facts = (data: MaintainerrStats) => [
		{label: 'To reclaim', value: formatBytes(data.reclaimableBytes)},
		{label: 'Items', value: formatCount(data.reclaimableItems)},
		{label: 'Cleaned up', value: formatCount(data.itemsHandled)},
	]
	if (!url) return {name, read: null, facts}

	const api = apiClient(`${url}/api`)

	return {
		name,
		facts,
		async read() {
			const {instances, collectionSummary, cleanupTotals} = await api<StorageMetrics>('/storage-metrics')
			return {
				data: {
					reclaimableItems: collectionSummary.reclaimableCount,
					reclaimableBytes: collectionSummary.activeSizeBytes,
					itemsHandled: cleanupTotals.itemsHandled,
				},
				issues: instances
					.filter(({ok}) => !ok)
					.map(({name: instance, error}) => ({level: 'warning' as const, message: `${instance}: ${error ?? 'unreachable'}`})),
			}
		},
	}
}
