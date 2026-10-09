import type {App} from '../umbrel'
import {freshrss} from './freshrss'

function env(name: string): string {
	const value = process.env[name]
	if (!value) throw new Error(`${name} is not set`)
	return value
}

export const apps: Record<string, () => App> = {
	'freshrss-mcp': () => freshrss({apiUrl: env('FRESHRSS_API_URL'), credentialsDir: env('FRESHRSS_CREDENTIALS_DIR')}),
}
