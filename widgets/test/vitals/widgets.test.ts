import {expect, test} from 'bun:test'

import type {VitalsSources} from '../../src/vitals/sources'
import {createSummary} from '../../src/vitals/summary'
import {vitalsWidgets} from '../../src/vitals/widgets'
import {absent, failing, fake} from './fixtures'

const arr = (queue: number, missing: number) => ({queue, missing, upcoming: 0, upcomingDays: 7})

test('the media widget sums up downloads, queues and missing media', async () => {
	const sources = {
		radarr: fake('Radarr', arr(2, 14)),
		sonarr: fake('Sonarr', arr(5, 9)),
		transmission: fake('Transmission', {downloading: 3, seeding: 1, paused: 0, downloadSpeed: 4_200_000, uploadSpeed: 0}),
	} as unknown as VitalsSources

	expect((await vitalsWidgets(createSummary(sources)).media!.read()) as unknown).toEqual({
		type: 'four-stats',
		refresh: '30s',
		link: '',
		items: [
			{title: 'Downloading', text: '3', subtext: '↓ 4.2 MB/s'},
			{title: 'Movies', text: '2', subtext: 'queued'},
			{title: 'Episodes', text: '5', subtext: 'queued'},
			{title: 'Missing', text: '23'},
		],
	})
})

test('the media widget shows dashes for apps it cannot read', async () => {
	const sources = {
		radarr: fake('Radarr', arr(2, 14)),
		sonarr: absent('Sonarr'),
		transmission: failing('Transmission', 'down'),
	} as unknown as VitalsSources

	const {items} = (await vitalsWidgets(createSummary(sources)).media!.read()) as {items: unknown[]}
	expect(items).toEqual([
		{title: 'Downloading', text: '–', subtext: ''},
		{title: 'Movies', text: '2', subtext: 'queued'},
		{title: 'Episodes', text: '–', subtext: 'queued'},
		{title: 'Missing', text: '14'},
	])
})
