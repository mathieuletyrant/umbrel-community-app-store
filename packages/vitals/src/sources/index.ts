import {arr} from './arr'
import {transmission} from './transmission'

// Adding an app to Vitals: a source module, one line here, and its URL/key in exports.sh.
export function sourcesFromEnv(env: NodeJS.ProcessEnv = process.env) {
	return {
		radarr: arr({name: 'Radarr', url: env.RADARR_URL, apiKey: env.RADARR_API_KEY, upcomingDays: 30}),
		sonarr: arr({name: 'Sonarr', url: env.SONARR_URL, apiKey: env.SONARR_API_KEY, upcomingDays: 7}),
		transmission: transmission({name: 'Transmission', url: env.TRANSMISSION_URL}),
	}
}

export type VitalsSources = ReturnType<typeof sourcesFromEnv>
