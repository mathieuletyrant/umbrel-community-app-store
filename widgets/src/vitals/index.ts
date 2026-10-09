import {required} from '../core/env'
import {createHandler} from '../widgets/handler'
import {createApiHandler} from './api'
import {sourcesFromEnv} from './sources'
import {createSummary} from './summary'
import {vitalsWidgets} from './widgets'

export function serveVitals(env: NodeJS.ProcessEnv = process.env) {
	const sources = sourcesFromEnv(env)
	const summary = createSummary(sources)
	const api = Bun.serve({
		port: Number(env.PORT ?? 3000),
		fetch: createApiHandler({sources, summary, token: required('VITALS_TOKEN', env)}),
	})
	// umbreld calls widgets without credentials, so they get their own port, never proxied.
	const widgets = Bun.serve({port: Number(env.WIDGETS_PORT ?? 3001), fetch: createHandler(vitalsWidgets(summary))})
	const configured = Object.entries(sources).filter(([, source]) => source.read).map(([id]) => id)
	console.log(`Vitals API on :${api.port}, widgets on :${widgets.port}, apps: ${configured.join(', ') || 'none'}`)
}
