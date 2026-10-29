import {requireEnv} from '@mathieu/core/env'

import {createApiHandler} from './api'
import {sourcesFromEnv} from './sources'
import {createSummary} from './summary'

const sources = sourcesFromEnv()
const summary = createSummary(sources)

const api = Bun.serve({
	port: Number(process.env.PORT ?? 3000),
	fetch: createApiHandler({sources, summary, token: requireEnv('VITALS_TOKEN')}),
})

const configured = Object.entries(sources).filter(([, source]) => source.check).map(([id]) => id)
console.log(`Vitals API on :${api.port}, apps: ${configured.join(', ') || 'none'}`)
