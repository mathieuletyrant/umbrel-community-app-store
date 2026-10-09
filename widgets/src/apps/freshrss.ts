import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {decodeHtml, timeAgo} from '../format'
import {HttpError, request} from '../http'
import type {App, FourStatsWidget, ListWidget} from '../umbrel'

type Config = {
	apiUrl: string
	credentialsDir: string
	now?: () => Date
}

type StreamContents = {items: {title: string; published: number; origin?: {title?: string}}[]}
type UnreadCounts = {unreadcounts: {id: string; count: number}[]}
type ItemIds = {itemRefs?: {id: string}[]}
type Subscriptions = {subscriptions: unknown[]}

const READING_LIST = 'user/-/state/com.google/reading-list'
const READ = 'user/-/state/com.google/read'
const STARRED = 'user/-/state/com.google/starred'
// Counting through item ids stops here; the widget shows "1000+" past it.
const COUNT_LIMIT = 1000

const LINK = '/freshrss'

export function freshrss({apiUrl, credentialsDir, now = () => new Date()}: Config): App {
	let token: Promise<string> | undefined

	const credential = async (file: string) => (await readFile(path.join(credentialsDir, file), 'utf8')).trim()

	async function login(): Promise<string> {
		const [user, password] = await Promise.all([credential('username'), credential('api_password')])
		const response = await request(`${apiUrl}/accounts/ClientLogin`, {
			method: 'POST',
			body: new URLSearchParams({Email: user, Passwd: password}),
		})
		const auth = (await response.text()).match(/^Auth=(.+)$/m)?.[1]
		if (!auth) throw new Error('FreshRSS login answered without an Auth token')
		return auth
	}

	async function get<T>(endpoint: string, params: Record<string, string>): Promise<T> {
		const url = `${apiUrl}/reader/api/0/${endpoint}?${new URLSearchParams({...params, output: 'json'})}`
		const fetchJson = async (auth: string) =>
			(await request(url, {headers: {Authorization: `GoogleLogin auth=${auth}`}})).json() as Promise<T>

		try {
			return await fetchJson(await auth())
		} catch (error) {
			if (!(error instanceof HttpError && error.status === 401)) throw error
			token = undefined
			return fetchJson(await auth())
		}
	}

	// One login shared by concurrent calls, forgotten when it fails.
	function auth(): Promise<string> {
		token ??= login().catch((error) => {
			token = undefined
			throw error
		})
		return token
	}

	async function itemIds(params: Record<string, string>): Promise<string[]> {
		const {itemRefs = []} = await get<ItemIds>('stream/items/ids', {...params, n: String(COUNT_LIMIT)})
		return itemRefs.map(({id}) => id)
	}

	const count = (ids: string[]) => (ids.length >= COUNT_LIMIT ? `${COUNT_LIMIT}+` : ids.length.toLocaleString('en'))

	const overview = (unread: string, today: string, starred: string, feeds: string): FourStatsWidget => ({
		type: 'four-stats',
		refresh: '5m',
		link: LINK,
		items: [
			{title: 'Unread', text: unread, subtext: 'articles'},
			{title: 'Today', text: today, subtext: 'new'},
			{title: 'Starred', text: starred},
			{title: 'Feeds', text: feeds},
		],
	})

	return {
		unread: {
			async read(): Promise<ListWidget> {
				const {items} = await get<StreamContents>(`stream/contents/${encodeURIComponent(READING_LIST)}`, {xt: READ, n: '5'})
				return {
					type: 'list',
					refresh: '2m',
					link: LINK,
					items: items.map((item) => ({
						text: decodeHtml(item.title),
						subtext: [item.origin?.title && decodeHtml(item.origin.title), timeAgo(new Date(item.published * 1000), now())]
							.filter(Boolean)
							.join(' · '),
					})),
					noItemsText: 'No unread articles',
				}
			},
			fallback: {type: 'list', refresh: '2m', link: LINK, items: [], noItemsText: "Can't reach FreshRSS"},
		},

		overview: {
			async read(): Promise<FourStatsWidget> {
				// FreshRSS entry ids are the microsecond timestamps at which articles were fetched.
				const dayAgo = (now().getTime() - 86_400_000) * 1000
				const [counts, unreadIds, starredIds, {subscriptions}] = await Promise.all([
					get<UnreadCounts>('unread-count', {}),
					itemIds({s: READING_LIST, xt: READ}),
					itemIds({s: STARRED}),
					get<Subscriptions>('subscription/list', {}),
				])
				const unread = counts.unreadcounts.find(({id}) => id === READING_LIST)?.count ?? 0
				const today = unreadIds.filter((id) => Number(id) >= dayAgo)
				return overview(unread.toLocaleString('en'), count(today), count(starredIds), subscriptions.length.toLocaleString('en'))
			},
			fallback: overview('–', '–', '–', '–'),
		},
	}
}
