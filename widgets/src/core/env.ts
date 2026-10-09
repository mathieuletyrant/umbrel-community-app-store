export function required(name: string, env: NodeJS.ProcessEnv = process.env): string {
	const value = env[name]
	if (!value) throw new Error(`${name} is not set`)
	return value
}
