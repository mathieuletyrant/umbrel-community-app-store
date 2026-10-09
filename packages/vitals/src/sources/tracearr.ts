import {formatCount} from '@mathieu/core/format'
import {apiClient} from '@mathieu/core/http'

import {keySetup} from './setup'
import type {Source} from '../types'

export type TracearrStats = {streams: number; transcodes: number; directPlays: number; directStreams: number; bitrate: string}

type Config = {name: string; url?: string; apiKey?: string}

export function tracearr({name, url, apiKey}: Config): Source<TracearrStats> {
	const facts = (data: TracearrStats) => [
		{label: 'Streams', value: formatCount(data.streams)},
		{label: 'Transcodes', value: formatCount(data.transcodes)},
		{label: 'Direct play', value: formatCount(data.directPlays)},
		{label: 'Bandwidth', value: data.bitrate},
	]
	if (!url || !apiKey) return {name, read: null, facts, setup: keySetup(name, url)}

	const api = apiClient(`${url}/api/v1/public`, {Authorization: `Bearer ${apiKey}`})

	return {
		name,
		facts,
		async read() {
			const {summary} = await api<{summary: Omit<TracearrStats, 'streams' | 'bitrate'> & {total: number; totalBitrate: string}}>(
				'/streams',
				{summary: 'true'},
			)
			return {
				data: {
					streams: summary.total,
					transcodes: summary.transcodes,
					directPlays: summary.directPlays,
					directStreams: summary.directStreams,
					bitrate: summary.totalBitrate,
				},
				issues: [],
			}
		},
	}
}
