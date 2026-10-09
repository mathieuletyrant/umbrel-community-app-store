import {errorMessage} from './http'

// The JSON umbrelOS renders for an app widget (getumbrel/umbrel, packages/ui/src/modules/widgets).
// `refresh` is required: umbreld parses it with ms() and fails the widget without it.

export type ListWidget = {
	type: 'list'
	refresh: string
	link?: string
	items: {text: string; subtext?: string}[]
	noItemsText?: string
}

export type FourStatsWidget = {
	type: 'four-stats'
	refresh: string
	link?: string
	items: [FourStatsItem, FourStatsItem, FourStatsItem, FourStatsItem]
}

type FourStatsItem = {title: string; text: string; subtext?: string}

export type Widget = ListWidget | FourStatsWidget

export type WidgetSource = {
	read: () => Promise<Widget>
	// Served when read() fails: an HTTP error would make umbrelOS show an error instead of the widget.
	fallback: Widget
}

export type WidgetSet = Record<string, WidgetSource>

// Serves an app's widgets by id, as umbreld fetches them.
export function createWidgetHandler(widgets: WidgetSet, log: (message: string) => void = console.error) {
	return async (request: Request): Promise<Response> => {
		const id = new URL(request.url).pathname.slice(1)
		const source = widgets[id]
		if (!source) return Response.json({error: `No widget named "${id}"`}, {status: 404})
		try {
			return Response.json(await source.read())
		} catch (error) {
			log(`${id}: ${errorMessage(error)}`)
			return Response.json(source.fallback)
		}
	}
}
