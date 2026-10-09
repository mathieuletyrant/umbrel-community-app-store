// umbreld waits for a widget without a timeout, so a hung app must not hang the server.
const TIMEOUT_MS = 3_000

export class HttpError extends Error {
	constructor(
		readonly status: number,
		url: string,
		readonly headers: Headers,
	) {
		super(`${new URL(url).pathname} answered HTTP ${status}`)
	}
}

export async function request(url: string, init: RequestInit = {}): Promise<Response> {
	const response = await fetch(url, {...init, signal: AbortSignal.timeout(TIMEOUT_MS)})
	if (!response.ok) throw new HttpError(response.status, url, response.headers)
	return response
}

export async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
	return (await request(url, {headers})).json() as Promise<T>
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
