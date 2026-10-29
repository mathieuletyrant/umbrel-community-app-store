export type Issue = {level: 'warning' | 'error'; message: string}

// `check` is null when the app is not installed or Vitals has no way in (no API key); `setup` then says what to do.
export type Source = {
	name: string
	check: (() => Promise<Issue[]>) | null
	setup?: string
}

export type Report =
	| {name: string; status: 'ok'; healthy: boolean; issues: Issue[]}
	| {name: string; status: 'error'; healthy: false; error: string}
	| {name: string; status: 'not-configured'; healthy: null}

export type Sources = Record<string, Source>

export type Summary<S extends Sources> = {
	version: 2
	generatedAt: string
	healthy: boolean
	apps: {[K in keyof S]: Report}
}
