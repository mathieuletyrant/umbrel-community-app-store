import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {decodeHtml, timeAgo} from '../format'
import {HttpError, request} from '../http'
import type {App, ListWidget} from '../umbrel'

type Config = {
	apiUrl: string
	credentialsDir: string
}

type StreamContents = {
	items: {title: string; published: number; origin?: {title?: string}}[]
}

const READING_LIST = 'user/-/state/com.google/reading-list'
const READ = 'user/-/state/com.google/read'

const base = {type: 'list', refresh: '2m', link: '/freshrss'} as const

export function freshrss({apiUrl, credentialsDir}: Config): App {
	let token: string | undefined

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

	async function latestUnread(): Promise<StreamContents> {
		const url = `${apiUrl}/reader/api/0/stream/contents/${encodeURIComponent(READING_LIST)}?${new URLSearchParams({xt: READ, n: '5', output: 'json'})}`
		const fetchStream = async (auth: string) =>
			(await request(url, {headers: {Authorization: `GoogleLogin auth=${auth}`}})).json() as Promise<StreamContents>

		token ??= await login()
		try {
			return await fetchStream(token)
		} catch (error) {
			if (!(error instanceof HttpError && error.status === 401)) throw error
			token = await login()
			return fetchStream(token)
		}
	}

	return {
		unread: {
			async read(): Promise<ListWidget> {
				const {items} = await latestUnread()
				return {
					...base,
					items: items.map((item) => ({
						text: decodeHtml(item.title),
						subtext: [item.origin?.title && decodeHtml(item.origin.title), timeAgo(new Date(item.published * 1000))]
							.filter(Boolean)
							.join(' · '),
					})),
					noItemsText: 'No unread articles',
				}
			},
			fallback: {...base, items: [], noItemsText: "Can't reach FreshRSS"},
		},
	}
}
