const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['week', 604_800],
	['day', 86_400],
	['hour', 3_600],
	['minute', 60],
]
const relative = new Intl.RelativeTimeFormat('en', {style: 'short', numeric: 'auto'})

export function timeAgo(date: Date, now = new Date()): string {
	const seconds = (now.getTime() - date.getTime()) / 1000
	for (const [unit, size] of UNITS) {
		if (seconds >= size) return relative.format(-Math.floor(seconds / size), unit)
	}
	return 'just now'
}

const NAMED_ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '}

export function decodeHtml(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
		if (!code.startsWith('#')) return NAMED_ENTITIES[code.toLowerCase()] ?? entity
		const point = /^#x/i.test(code) ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
		return point <= 0x10ffff ? String.fromCodePoint(point) : entity
	})
}

// Decimal units, like Transmission's and the *arr apps' own interfaces.
function decimal(value: number, units: string[]): string {
	let unit = 0
	while (value >= 1000 && unit < units.length - 1) {
		value /= 1000
		unit++
	}
	return `${unit === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export const formatSpeed = (bytesPerSecond: number) => decimal(bytesPerSecond, ['B/s', 'kB/s', 'MB/s', 'GB/s'])

export const formatBytes = (bytes: number) => decimal(bytes, ['B', 'kB', 'MB', 'GB', 'TB'])

export const formatCount = (count: number) => count.toLocaleString('en')
