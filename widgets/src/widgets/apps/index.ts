import {required} from '../../core/env'
import type {App} from '../types'
import {freshrss} from './freshrss'

export const apps: Record<string, () => App> = {
	'freshrss-mcp': () =>
		freshrss({apiUrl: required('FRESHRSS_API_URL'), credentialsDir: required('FRESHRSS_CREDENTIALS_DIR')}),
}
