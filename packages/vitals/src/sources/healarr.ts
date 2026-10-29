import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Issue, Source} from '../types'

type Dashboard = {pending_corruptions: number; manual_intervention_corruptions: number}

type Config = {name: string; url?: string; apiKey?: string}

export function healarr({name, url, apiKey}: Config): Source {
	if (!url || !apiKey) return {name, check: null, setup: keySetup(name, url)}

	const api = apiClient(`${url}/api`, {'X-API-Key': apiKey})

	return {
		name,
		async check() {
			const stats = await api<Dashboard>('/stats/dashboard')
			const issues: Issue[] = []
			if (stats.pending_corruptions) {
				issues.push({level: 'warning', message: `${stats.pending_corruptions} corrupted file(s) waiting for repair`})
			}
			if (stats.manual_intervention_corruptions) {
				issues.push({level: 'warning', message: `${stats.manual_intervention_corruptions} file(s) need a manual fix`})
			}
			return issues
		},
	}
}
