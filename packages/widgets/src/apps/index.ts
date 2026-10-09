import {requireEnv} from '@mathieu/core/env'
import type {WidgetSet} from '@mathieu/core/widget'

import {freshrss} from './freshrss'

export const apps: Record<string, () => WidgetSet> = {
	'freshrss-mcp': () =>
		freshrss({apiUrl: requireEnv('FRESHRSS_API_URL'), credentialsDir: requireEnv('FRESHRSS_CREDENTIALS_DIR')}),
}
