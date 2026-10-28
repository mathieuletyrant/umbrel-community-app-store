import {formatCount, formatSpeed} from '@mathieu/core/format'
import {HttpError, request} from '@mathieu/core/http'

import type {Issue, Source} from '../types'

export type QbittorrentStats = {
	downloading: number
	seeding: number
	paused: number
	downloadSpeed: number
	uploadSpeed: number
}

type Config = {name: string; url?: string; username?: string; password?: string}

// https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-5.0) (torrents/info, state)
const DOWNLOADING = new Set(['downloading', 'metaDL', 'forcedMetaDL', 'forcedDL', 'stalledDL', 'queuedDL', 'checkingDL', 'allocating'])
const SEEDING = new Set(['uploading', 'forcedUP', 'stalledUP', 'queuedUP', 'checkingUP'])
const PAUSED = new Set(['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP'])
const FAILING = new Set(['error', 'missingFiles'])

export function qbittorrent({name, url, username = 'admin', password}: Config): Source<QbittorrentStats> {
	const facts = (data: QbittorrentStats) => [
		{label: 'Downloading', value: formatCount(data.downloading)},
		{label: 'Seeding', value: formatCount(data.seeding)},
		{label: 'Down', value: formatSpeed(data.downloadSpeed)},
		{label: 'Up', value: formatSpeed(data.uploadSpeed)},
	]
	if (!url || !password) return {name, read: null, facts}

	const base = url.replace(/\/+$/, '')
	let cookie = ''
	let pending: Promise<void> | null = null

	// Both reads of a refresh run at once: they share one login instead of opening two sessions.
	function login() {
		pending ??= signIn().finally(() => {
			pending = null
		})
		return pending
	}

	async function signIn() {
		const response = await request(`${base}/api/v2/auth/login`, {
			method: 'POST',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			body: new URLSearchParams({username, password: password!}),
		})
		// A good login sets the session cookie (SID, or QBT_SID_<port> in recent versions), with
		// "Ok." before 5.2 and an empty 204 since; a bad one answers 200 "Fails." and no cookie.
		const sid = response.headers.get('set-cookie')?.match(/(?:QBT_)?SID[^=;]*=[^;]+/)?.[0]
		if ((await response.text()).trim() === 'Fails.' || !sid) throw new Error('qBittorrent refused the login: check its username and password')
		cookie = sid
	}

	// The session cookie expires after the Web UI's session timeout: log in again once on 403.
	async function get<T>(path: string): Promise<T> {
		if (!cookie) await login()
		const used = cookie
		try {
			return (await (await request(`${base}${path}`, {headers: {Cookie: cookie}})).json()) as T
		} catch (error) {
			if (!(error instanceof HttpError && error.status === 403)) throw error
			if (cookie === used) await login()
			return (await (await request(`${base}${path}`, {headers: {Cookie: cookie}})).json()) as T
		}
	}

	return {
		name,
		facts,
		async read() {
			const [torrents, transfer] = await Promise.all([
				get<{state: string; name: string}[]>('/api/v2/torrents/info'),
				get<{dl_info_speed: number; up_info_speed: number}>('/api/v2/transfer/info'),
			])
			const count = (states: Set<string>) => torrents.filter(({state}) => states.has(state)).length
			const failing = torrents.filter(({state}) => FAILING.has(state))
			const issues: Issue[] = failing.length
				? [{level: 'warning', message: `${failing.length} torrent(s) in error: ${failing[0]!.name}`}]
				: []
			return {
				data: {
					downloading: count(DOWNLOADING),
					seeding: count(SEEDING),
					paused: count(PAUSED),
					downloadSpeed: transfer.dl_info_speed,
					uploadSpeed: transfer.up_info_speed,
				},
				issues,
			}
		},
	}
}
