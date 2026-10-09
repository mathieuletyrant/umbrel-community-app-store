import type {Issue, Source} from '../../src/vitals/types'

export const fake = <T>(name: string, data: T, issues: Issue[] = []): Source<T> => ({
	name,
	read: async () => ({data, issues}),
	facts: () => [],
})

export const failing = (name: string, message: string): Source<unknown> => ({
	name,
	read: async () => {
		throw new Error(message)
	},
	facts: () => [],
})

export const absent = (name: string): Source<unknown> => ({name, read: null, facts: () => []})
