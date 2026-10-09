import {createWidgetHandler} from '@mathieu/core/widget'

import {apps} from './apps'

const name = process.env.WIDGET_APP ?? ''
const app = apps[name]
if (!app) {
	console.error(`WIDGET_APP must be one of: ${Object.keys(apps).join(', ')}`)
	process.exit(1)
}

const server = Bun.serve({port: Number(process.env.PORT ?? 3000), fetch: createWidgetHandler(app())})
console.log(`${name} widgets listening on :${server.port}`)
