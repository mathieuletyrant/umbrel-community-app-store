import {expect, test} from 'bun:test'

import {decodeHtml, timeAgo} from '../src/format'

const now = new Date('2026-10-09T12:00:00Z')
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000)

test('timeAgo picks the largest whole unit', () => {
	expect(timeAgo(ago(30), now)).toBe('just now')
	expect(timeAgo(ago(5 * 60), now)).toBe('5 min. ago')
	expect(timeAgo(ago(2 * 3_600 + 59 * 60), now)).toBe('2 hr. ago')
	expect(timeAgo(ago(86_400), now)).toBe('yesterday')
	expect(timeAgo(ago(15 * 86_400), now)).toBe('2 wk. ago')
})

test('timeAgo treats a date in the future as just now', () => {
	expect(timeAgo(ago(-120), now)).toBe('just now')
})

test('decodeHtml decodes named and numeric entities', () => {
	expect(decodeHtml('R&amp;D &lt;3 &quot;Umbrel&quot; &#039;24 &#x2014; caf&eacute;')).toBe('R&D <3 "Umbrel" \'24 — caf&eacute;')
	expect(decodeHtml('&#99999999;')).toBe('&#99999999;')
})
