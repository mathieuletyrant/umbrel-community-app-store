import {formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

import type {Issue, Source} from '../types'

export type HealarrStats = {scannedToday: number; corrupted: number; needsAttention: number; repaired: number}

type Dashboard = {
	files_scanned_today: number
	pending_corruptions: number
	manual_intervention_corruptions: number
	successful_remediations: number
}

type Config = {name: string; url?: string; apiKey?: string}

export function healarr({name, url, apiKey}: Config): Source<HealarrStats> {
	const facts = (data: HealarrStats) => [
		{label: 'Scanned today', value: formatCount(data.scannedToday)},
		{label: 'Corrupted', value: formatCount(data.corrupted)},
		{label: 'Needs you', value: formatCount(data.needsAttention)},
		{label: 'Repaired', value: formatCount(data.repaired)},
	]
	if (!url || !apiKey) return {name, read: null, facts}

	const api = apiClient(`${url}/api`, {'X-API-Key': apiKey})

	return {
		name,
		facts,
		async read() {
			const stats = await api<Dashboard>('/stats/dashboard')
			const issues: Issue[] = []
			if (stats.pending_corruptions) {
				issues.push({level: 'warning', message: `${stats.pending_corruptions} corrupted file(s) waiting for repair`})
			}
			if (stats.manual_intervention_corruptions) {
				issues.push({level: 'warning', message: `${stats.manual_intervention_corruptions} file(s) need a manual fix`})
			}
			return {
				data: {
					scannedToday: stats.files_scanned_today,
					corrupted: stats.pending_corruptions,
					needsAttention: stats.manual_intervention_corruptions,
					repaired: stats.successful_remediations,
				},
				issues,
			}
		},
	}
}
