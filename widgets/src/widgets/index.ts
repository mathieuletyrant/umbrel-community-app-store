import {apps} from './apps'
import {createHandler} from './handler'

export function serveWidgets(env: NodeJS.ProcessEnv = process.env) {
	const name = env.WIDGET_APP ?? ''
	const app = apps[name]
	if (!app) {
		console.error(`WIDGET_APP must be one of: ${Object.keys(apps).join(', ')}`)
		process.exit(1)
	}
	const server = Bun.serve({port: Number(env.PORT ?? 3000), fetch: createHandler(app())})
	console.log(`${name} widgets listening on :${server.port}`)
}
