import {requireEnv} from '@mathieu/core/env'
import type {WidgetSet} from '@mathieu/core/widget'

import {freshrss} from './freshrss'

export const apps: Record<string, () => WidgetSet> = {
	'freshrss-mcp': () =>
		freshrss({
			apiUrl: requireEnv('FRESHRSS_API_URL'),
			username: process.env.FRESHRSS_USERNAME,
			password: process.env.FRESHRSS_API_PASSWORD,
		}),
}
