import {formatBytes, formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

import type {Source} from '../types'

export type MaintainerrStats = {
	pendingItems: number
	reclaimableCollections: number
	reclaimableBytes: number
	itemsHandled: number
}

type StorageMetrics = {
	instances: {name: string; ok: boolean; error: string | null}[]
	collectionSummary: {reclaimableCount: number; activeSizeBytes: number}
	cleanupTotals: {itemsHandled: number}
}

type Collection = {isActive: boolean; deleteAfterDays: number | null; mediaCount?: number}

// Same rule as Maintainerr's collectionSummary.reclaimableCount: active, and deletes after some days.
const deletes = ({isActive, deleteAfterDays}: Collection) => isActive && (deleteAfterDays ?? 0) > 0

type Config = {name: string; url?: string}

// Maintainerr has no API key: the Umbrel login guards it, and Vitals reaches it on the Docker network.
export function maintainerr({name, url}: Config): Source<MaintainerrStats> {
	const facts = (data: MaintainerrStats) => [
		{label: 'To reclaim', value: formatBytes(data.reclaimableBytes)},
		{label: 'Pending deletion', value: formatCount(data.pendingItems)},
		{label: 'Collections', value: formatCount(data.reclaimableCollections)},
		{label: 'Cleaned up', value: formatCount(data.itemsHandled)},
	]
	if (!url) return {name, read: null, facts}

	const api = apiClient(`${url}/api`)

	return {
		name,
		facts,
		async read() {
			const [{instances, collectionSummary, cleanupTotals}, collections] = await Promise.all([
				api<StorageMetrics>('/storage-metrics'),
				api<Collection[]>('/collections'),
			])
			return {
				data: {
					// A media item in two deleting collections counts twice: Maintainerr gives no deduplicated count.
					pendingItems: collections.filter(deletes).reduce((sum, c) => sum + (c.mediaCount ?? 0), 0),
					reclaimableCollections: collectionSummary.reclaimableCount,
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
