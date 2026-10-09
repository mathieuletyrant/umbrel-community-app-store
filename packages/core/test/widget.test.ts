import {expect, test} from 'bun:test'

import {createWidgetHandler, type ListWidget, type WidgetSet} from '../src/widget'

const fallback: ListWidget = {type: 'list', refresh: '1m', items: [], noItemsText: 'Unavailable'}
const widgets: WidgetSet = {
	ok: {read: async () => ({type: 'list', refresh: '1m', items: [{text: 'hello'}]}), fallback},
	broken: {read: async () => Promise.reject(new Error('app is down')), fallback},
}

test('serves a widget by its id', async () => {
	const response = await createWidgetHandler(widgets)(new Request('http://widget/ok'))
	expect(response.status).toBe(200)
	expect(await response.json()).toEqual({type: 'list', refresh: '1m', items: [{text: 'hello'}]})
})

test('serves the fallback with HTTP 200 when the app fails', async () => {
	const logged: string[] = []
	const response = await createWidgetHandler(widgets, (message) => logged.push(message))(new Request('http://widget/broken'))
	expect(response.status).toBe(200)
	expect(await response.json()).toEqual(fallback)
	expect(logged).toEqual(['broken: app is down'])
})

test('answers 404 for an unknown widget', async () => {
	const response = await createWidgetHandler(widgets)(new Request('http://widget/nope'))
	expect(response.status).toBe(404)
})
