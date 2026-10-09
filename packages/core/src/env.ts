// Startup configuration: a missing variable stops the server with one clear line.
export function requireEnv(name: string, env: NodeJS.ProcessEnv = process.env): string {
	const value = env[name]
	if (value) return value
	console.error(`${name} is not set`)
	process.exit(1)
}
