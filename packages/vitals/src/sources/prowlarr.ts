import {formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

import type {Source} from '../types'
import {type ArrHealth, arrIssues} from './arr'

export type ProwlarrStats = {indexers: number; failing: number}

type Config = {name: string; url?: string; apiKey?: string; now?: () => Date}

export function prowlarr({name, url, apiKey, now = () => new Date()}: Config): Source<ProwlarrStats> {
	const facts = (data: ProwlarrStats) => [
		{label: 'Indexers', value: formatCount(data.indexers)},
		{label: 'Failing', value: formatCount(data.failing)},
	]
	if (!url || !apiKey) return {name, read: null, facts}

	const api = apiClient(`${url}/api/v1`, {'X-Api-Key': apiKey})

	return {
		name,
		facts,
		async read() {
			const [indexers, statuses, health] = await Promise.all([
				api<{enable: boolean}[]>('/indexer'),
				api<{disabledTill?: string | null}[]>('/indexerstatus'),
				api<ArrHealth>('/health'),
			])
			const at = now().getTime()
			return {
				data: {
					indexers: indexers.filter(({enable}) => enable).length,
					failing: statuses.filter(({disabledTill}) => disabledTill && Date.parse(disabledTill) > at).length,
				},
				issues: arrIssues(health),
			}
		},
	}
}
