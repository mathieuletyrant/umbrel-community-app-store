import {requireEnv} from '@mathieu/core/env'
import {createWidgetHandler} from '@mathieu/core/widget'

import {createApiHandler} from './api'
import {sourcesFromEnv} from './sources'
import {createSummary} from './summary'
import {vitalsWidgets} from './widgets'

const sources = sourcesFromEnv()
const summary = createSummary(sources)

const api = Bun.serve({
	port: Number(process.env.PORT ?? 3000),
	fetch: createApiHandler({sources, summary, token: requireEnv('VITALS_TOKEN')}),
})
// umbreld calls widgets without credentials, so they get their own port, never proxied.
const widgets = Bun.serve({port: Number(process.env.WIDGETS_PORT ?? 3001), fetch: createWidgetHandler(vitalsWidgets(summary))})

const configured = Object.entries(sources).filter(([, source]) => source.read).map(([id]) => id)
console.log(`Vitals API on :${api.port}, widgets on :${widgets.port}, apps: ${configured.join(', ') || 'none'}`)
