import {serveVitals} from './vitals'
import {serveWidgets} from './widgets'

const [mode = 'widgets'] = process.argv.slice(2)

if (mode === 'vitals') serveVitals()
else if (mode === 'widgets') serveWidgets()
else {
	console.error(`Unknown mode "${mode}": use "widgets" (default) or "vitals"`)
	process.exit(1)
}
