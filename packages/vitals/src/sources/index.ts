import {arr} from './arr'
import {bazarr} from './bazarr'
import {cleanuparr} from './cleanuparr'
import {healarr} from './healarr'
import {maintainerr} from './maintainerr'
import {prowlarr} from './prowlarr'
import {seerr} from './seerr'
import {tracearr} from './tracearr'
import {transmission} from './transmission'

// Adding an app to Vitals: a source module, one line here, and its URL (and key) in exports.sh.
export function sourcesFromEnv(env: NodeJS.ProcessEnv = process.env) {
	return {
		radarr: arr({name: 'Radarr', url: env.RADARR_URL, apiKey: env.RADARR_API_KEY, upcomingDays: 30}),
		sonarr: arr({name: 'Sonarr', url: env.SONARR_URL, apiKey: env.SONARR_API_KEY, upcomingDays: 7}),
		prowlarr: prowlarr({name: 'Prowlarr', url: env.PROWLARR_URL, apiKey: env.PROWLARR_API_KEY}),
		bazarr: bazarr({name: 'Bazarr', url: env.BAZARR_URL, apiKey: env.BAZARR_API_KEY}),
		seerr: seerr({name: 'Seerr', url: env.SEERR_URL, apiKey: env.SEERR_API_KEY}),
		transmission: transmission({name: 'Transmission', url: env.TRANSMISSION_URL}),
		maintainerr: maintainerr({name: 'Maintainerr', url: env.MAINTAINERR_URL}),
		healarr: healarr({name: 'Healarr', url: env.HEALARR_URL, apiKey: env.HEALARR_API_KEY}),
		cleanuparr: cleanuparr({name: 'Cleanuparr', url: env.CLEANUPARR_URL, apiKey: env.CLEANUPARR_API_KEY}),
		tracearr: tracearr({name: 'Tracearr', url: env.TRACEARR_URL, apiKey: env.TRACEARR_API_KEY}),
	}
}

export type VitalsSources = ReturnType<typeof sourcesFromEnv>
