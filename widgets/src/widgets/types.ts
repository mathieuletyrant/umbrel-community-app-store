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

export type App = Record<string, WidgetSource>
