import {formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

import type {Source} from '../types'

export type BazarrStats = {missingEpisodes: number; missingMovies: number; throttledProviders: number}

type Config = {name: string; url?: string; apiKey?: string}

// Missing subtitles, counted per language like Bazarr's own sidebar badges.
export function bazarr({name, url, apiKey}: Config): Source<BazarrStats> {
	const facts = (data: BazarrStats) => [
		{label: 'Episodes missing', value: formatCount(data.missingEpisodes)},
		{label: 'Movies missing', value: formatCount(data.missingMovies)},
		{label: 'Throttled providers', value: formatCount(data.throttledProviders)},
	]
	if (!url || !apiKey) return {name, read: null, facts}

	const api = apiClient(`${url}/api`, {'X-API-KEY': apiKey})

	return {
		name,
		facts,
		async read() {
			const [badges, health] = await Promise.all([
				api<{episodes: number; movies: number; providers: number}>('/badges'),
				api<{data: {object: string; issue: string}[]}>('/system/health'),
			])
			return {
				data: {missingEpisodes: badges.episodes, missingMovies: badges.movies, throttledProviders: badges.providers},
				issues: health.data.map(({object, issue}) => ({level: 'warning' as const, message: `${object}: ${issue}`})),
			}
		},
	}
}
