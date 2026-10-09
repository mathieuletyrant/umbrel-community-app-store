import {errorMessage} from '@mathieu/core/http'

import type {Report, Source, Sources, Summary} from './types'

type Options = {
	// The dashboard and umbreld may poll often: apps are asked at most once per window.
	cacheMs?: number
	now?: () => Date
}

export function createSummary<S extends Sources>(sources: S, {cacheMs = 10_000, now = () => new Date()}: Options = {}) {
	let cached: {at: number; summary: Promise<Summary<S>>} | undefined

	async function collect(): Promise<Summary<S>> {
		const entries = await Promise.all(Object.entries(sources).map(async ([id, source]) => [id, await report(source)] as const))
		const reports = entries.map(([, entry]) => entry)
		return {
			version: 1,
			generatedAt: now().toISOString(),
			healthy: reports.every((entry) => entry.healthy !== false),
			apps: Object.fromEntries(entries) as Summary<S>['apps'],
		}
	}

	return function summary(): Promise<Summary<S>> {
		const at = now().getTime()
		if (!cached || at - cached.at >= cacheMs) cached = {at, summary: collect()}
		return cached.summary
	}
}

async function report<T>({name, read}: Source<T>): Promise<Report<T>> {
	if (!read) return {name, status: 'not-configured', healthy: null}
	try {
		const {data, issues} = await read()
		return {name, status: 'ok', healthy: !issues.some(({level}) => level === 'error'), issues, data}
	} catch (error) {
		return {name, status: 'error', healthy: false, error: errorMessage(error)}
	}
}
