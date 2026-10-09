// umbreld waits for the widget without a timeout, so a hung app must not hang the widget.
const TIMEOUT_MS = 3_000

export class HttpError extends Error {
	constructor(
		readonly status: number,
		url: string,
	) {
		super(`${new URL(url).pathname} answered HTTP ${status}`)
	}
}

export async function request(url: string, init: RequestInit = {}): Promise<Response> {
	const response = await fetch(url, {...init, signal: AbortSignal.timeout(TIMEOUT_MS)})
	if (!response.ok) throw new HttpError(response.status, url)
	return response
}
