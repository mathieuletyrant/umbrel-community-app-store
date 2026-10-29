import {HttpError, request} from '@mathieu/core/http'

import type {Source} from '../types'

type Config = {name: string; url?: string; username?: string; password?: string}

export function qbittorrent({name, url, username = 'admin', password}: Config): Source {
	if (!url || !password) return {name, check: null}

	const base = url.replace(/\/+$/, '')
	let cookie = ''

	async function login() {
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
		try {
			return (await (await request(`${base}${path}`, {headers: {Cookie: cookie}})).json()) as T
		} catch (error) {
			if (!(error instanceof HttpError && error.status === 403)) throw error
			await login()
			return (await (await request(`${base}${path}`, {headers: {Cookie: cookie}})).json()) as T
		}
	}

	return {
		name,
		async check() {
			// "errored": torrents in the error or missingFiles state.
			const failing = await get<{name: string}[]>('/api/v2/torrents/info?filter=errored')
			return failing.length ? [{level: 'warning', message: `${failing.length} torrent(s) in error: ${failing[0]!.name}`}] : []
		},
	}
}
