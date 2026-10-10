import type {Report, Source, Sources, Summary} from './types'

const escape = (text: string) =>
	text.replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]!)

const STATE: Record<Report<unknown>['status'], {label: string; tone: string}> = {
	ok: {label: 'Healthy', tone: 'ok'},
	error: {label: 'Unreachable', tone: 'bad'},
	'not-configured': {label: 'Not set up', tone: 'off'},
}

function card<T>(id: string, report: Report<T>, {facts, setup}: Source<T>): string {
	const state = report.status === 'ok' && !report.healthy ? {label: 'Needs attention', tone: 'warn'} : STATE[report.status]
	const body =
		report.status === 'ok'
			? `<dl>${facts(report.data)
					.map(({label, value}) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`)
					.join('')}</dl>${
					report.issues.length
						? `<ul>${report.issues.map(({level, message}) => `<li class="${level}">${escape(message)}</li>`).join('')}</ul>`
						: ''
				}`
			: report.status === 'error'
				? `<p class="note">${escape(report.error)}</p>`
				: `<p class="note">${escape(setup ?? `Set ${report.name}'s address in Vitals' settings in umbrelOS.`)}</p>`
	return `<article><header><h2>${escape(report.name)}</h2><span class="pill ${state.tone}">${state.label}</span></header>${body}<code>/v1/apps/${escape(id)}</code></article>`
}

export function renderPage<S extends Sources>(sources: S, summary: Summary<S>): string {
	const cards = Object.entries(summary.apps)
		.map(([id, report]) => card(id, report as Report<unknown>, sources[id]!))
		.join('')
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="30">
<title>Vitals</title>
<style>
:root{--bg:#f4f5f7;--card:#fff;--fg:#16181d;--muted:#6b7080;--line:#e3e5ea;--ok:#16794f;--ok-bg:#dff3e9;--warn:#9a5b00;--warn-bg:#fbefd9;--bad:#b42318;--bad-bg:#fde4e1;--off:#6b7080;--off-bg:#eceef2;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#111318;--card:#1a1d24;--fg:#eceef3;--muted:#9aa0ae;--line:#2a2e38;--ok:#4cc38a;--ok-bg:#153527;--warn:#e5a540;--warn-bg:#3a2b12;--bad:#f2766b;--bad-bg:#3d1b18;--off:#8a90a0;--off-bg:#23262e;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:960px;margin:0 auto;padding:40px 20px;display:flex;flex-direction:column;gap:28px}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
h1{margin:0;font-size:28px;letter-spacing:-.02em}
.sub{color:var(--muted);margin:4px 0 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
article{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:14px}
article header{display:flex;justify-content:space-between;align-items:center;gap:8px}
h2{margin:0;font-size:17px}
.pill{font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap}
.ok{color:var(--ok);background:var(--ok-bg)}.warn{color:var(--warn);background:var(--warn-bg)}.bad{color:var(--bad);background:var(--bad-bg)}.off{color:var(--off);background:var(--off-bg)}
dl{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}
dt{color:var(--muted);font-size:12px}dd{margin:0;font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
ul{margin:0;padding-left:18px;font-size:13px}li.error{color:var(--bad)}li.warning{color:var(--warn)}
.note{margin:0;color:var(--muted);font-size:13px}
code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
.api{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;font-size:14px}
.api pre{margin:10px 0 0;overflow-x:auto;font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
</style>
</head>
<body>
<main>
<div class="top">
<div><h1>Vitals</h1><p class="sub">Updated ${escape(new Date(summary.generatedAt).toUTCString())}</p></div>
<span class="pill ${summary.healthy ? 'ok' : 'bad'}">${summary.healthy ? 'All healthy' : 'Something needs attention'}</span>
</div>
<div class="grid">${cards}</div>
<section class="api"><strong>JSON API</strong> for dashboards, with the password shown in this app's settings as bearer token:
<pre>curl -H "Authorization: Bearer &lt;password&gt;" <span id="origin">http://umbrel.local</span>/v1/summary</pre></section>
<script>document.getElementById("origin").textContent = location.origin</script>
</main>
</body>
</html>`
}
