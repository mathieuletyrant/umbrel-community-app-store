import {formatCount, formatSpeed} from '../core/format'
import type {App, FourStatsWidget} from '../widgets/types'
import type {VitalsSources} from './sources'
import type {Report, Summary} from './types'

const DASH = '–'

const dataOf = <T>(report: Report<T>): T | undefined => (report.status === 'ok' ? report.data : undefined)

const media = (downloading: string, speed: string, movies: string, episodes: string, missing: string): FourStatsWidget => ({
	type: 'four-stats',
	refresh: '30s',
	link: '',
	items: [
		{title: 'Downloading', text: downloading, subtext: speed},
		{title: 'Movies', text: movies, subtext: 'queued'},
		{title: 'Episodes', text: episodes, subtext: 'queued'},
		{title: 'Missing', text: missing},
	],
})

export function vitalsWidgets(summary: () => Promise<Summary<VitalsSources>>): App {
	return {
		media: {
			async read() {
				const {apps} = await summary()
				const [radarr, sonarr, transmission] = [dataOf(apps.radarr), dataOf(apps.sonarr), dataOf(apps.transmission)]
				return media(
					transmission ? formatCount(transmission.downloading) : DASH,
					transmission ? `↓ ${formatSpeed(transmission.downloadSpeed)}` : '',
					radarr ? formatCount(radarr.queue) : DASH,
					sonarr ? formatCount(sonarr.queue) : DASH,
					radarr || sonarr ? formatCount((radarr?.missing ?? 0) + (sonarr?.missing ?? 0)) : DASH,
				)
			},
			fallback: media(DASH, '', DASH, DASH, DASH),
		},
	}
}
