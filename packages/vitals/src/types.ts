export type Issue = {level: 'warning' | 'error'; message: string}

export type Reading<T> = {data: T; issues: Issue[]}

export type Fact = {label: string; value: string}

// `read` is null when the app is not installed or Vitals has no way in (no API key); `setup` then says what to do.
export type Source<T> = {
	name: string
	read: (() => Promise<Reading<T>>) | null
	facts: (data: T) => Fact[]
	setup?: string
}

export type Report<T> =
	| {name: string; status: 'ok'; healthy: boolean; issues: Issue[]; data: T}
	| {name: string; status: 'error'; healthy: false; error: string}
	| {name: string; status: 'not-configured'; healthy: null}

export type Sources = Record<string, Source<any>>

type DataOf<S> = S extends Source<infer T> ? T : never

export type Summary<S extends Sources> = {
	version: 1
	generatedAt: string
	healthy: boolean
	apps: {[K in keyof S]: Report<DataOf<S[K]>>}
}
