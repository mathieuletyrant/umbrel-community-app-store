#!/usr/bin/env node
import {AsyncLocalStorage} from 'node:async_hooks'
import {execFileSync, spawn} from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import {createRequire} from 'node:module'
import {fileURLToPath, pathToFileURL} from 'node:url'

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = execFileSync('git', ['-C', SKILL_DIR, 'rev-parse', '--show-toplevel'], {encoding: 'utf8'}).trim()
const FLOWS_DIR = path.join(SKILL_DIR, 'flows')
const HOME = process.env.VERIFY_HOME || path.join(os.homedir(), '.umbrel-verify')
const STATE_FILE = path.join(HOME, 'state.json')
const UMBREL_PORT = Number(process.env.VERIFY_UMBREL_PORT || 80)
const GIT_PORT = Number(process.env.VERIFY_GIT_PORT || 8418)
const CONTROL_PORT = Number(process.env.VERIFY_CONTROL_PORT || 8419)
const PASSWORD = 'umbrel-verify'
const CONTAINER = 'umbrel-verify'

// renovate: datasource=docker depName=dockurr/umbrel
const UMBREL_IMAGE = 'dockurr/umbrel:2.0.0@sha256:11cb2635ff795284c0d406a1336ede0e386cc0f494457b1bf22e889ec6a77bdc'
const umbrelImage = (tag) => (tag ? `dockurr/umbrel:${tag}` : UMBREL_IMAGE)
const umbrelVersion = (image) => image.split(':')[1].split('@')[0]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// `run` is quiet: details go to <out>/run.log, stdout only gets milestones (say) and the summary,
// so a background run's output is short to read. Each line carries the app it belongs to when
// several apps are verified at once.
const output = {quiet: false, file: null}
const appScope = new AsyncLocalStorage()
const line = (a) => {
	const app = appScope.getStore()
	return `${app ? `[${app}] ` : ''}${a.join(' ')}`
}
const toFile = (l) => output.file && fs.appendFileSync(output.file, l + '\n')
const log = (...a) => {
	const l = line(a)
	toFile(`› ${l}`)
	if (!output.quiet) console.log('›', l)
}
const say = (...a) => {
	const l = line(a)
	toFile(`» ${l}`)
	console.log(output.quiet ? l : `› ${l}`)
}
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts}).trim()
const trySh = (cmd, args, opts) => {
	try {
		return sh(cmd, args, opts)
	} catch {
		return null
	}
}
const readYaml = (file) =>
	JSON.parse(sh('python3', ['-c', 'import sys,json,yaml;print(json.dumps(yaml.safe_load(open(sys.argv[1])) or {}))', file]))
const parseYaml = (text) => JSON.parse(sh('python3', ['-c', 'import sys,json,yaml;print(json.dumps(yaml.safe_load(sys.stdin.read())))'], {input: text, stdio: ['pipe', 'pipe', 'pipe']}))
const loadState = () => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {})
const saveState = (s) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))

function parseArgs(argv) {
	const flags = {}
	const rest = []
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (!a.startsWith('--')) rest.push(a)
		else if (['--out', '--umbrel', '--pr', '--steps', '--jobs'].includes(a)) flags[a.slice(2)] = argv[++i]
		else flags[a.slice(2)] = true
	}
	return {flags, rest}
}

// ── Docker + umbrelOS ────────────────────────────────────────────────────────

async function ensureDocker() {
	if (trySh('docker', ['info']) !== null) return
	if (process.getuid?.() !== 0 || !trySh('which', ['dockerd'])) throw new Error('Docker daemon is not running')
	log('starting dockerd')
	const out = fs.openSync(path.join(HOME, 'dockerd.log'), 'a')
	spawn('dockerd', ['--registry-mirror', 'https://mirror.gcr.io'], {detached: true, stdio: ['ignore', out, out]}).unref()
	for (let i = 0; i < 60; i++) {
		if (trySh('docker', ['info']) !== null) return
		await sleep(1000)
	}
	throw new Error(`dockerd did not start, see ${HOME}/dockerd.log`)
}

function caBundle() {
	for (const f of [process.env.VERIFY_CA_BUNDLE, '/root/.ccr/ca-bundle.crt', process.env.NODE_EXTRA_CA_CERTS])
		if (f && fs.existsSync(f)) return f
	return null
}

async function up(tag) {
	fs.mkdirSync(HOME, {recursive: true})
	await ensureDocker()
	const image = umbrelImage(tag)
	const version = umbrelVersion(image)
	const state = loadState()
	const running = trySh('docker', ['inspect', '-f', '{{.State.Running}} {{.Config.Image}}', CONTAINER])
	if (running && (running !== `true ${image}` || state.umbrel !== version)) {
		log(`umbrelOS ${state.umbrel ?? '?'} running, switching to ${version}`)
		await down()
	}
	if (!running || running !== `true ${image}`) {
		fs.mkdirSync(path.join(HOME, 'data'), {recursive: true})
		trySh('docker', ['rm', '-f', CONTAINER])
		const ca = caBundle()
		log(`starting umbrelOS ${version} (${image.split('@')[0]})`)
		sh('docker', [
			'run', '-d', '--name', CONTAINER, '--pid=host', '-p', `${UMBREL_PORT}:80`,
			'-v', `${path.join(HOME, 'data')}:/data`,
			'-v', '/var/run/docker.sock:/var/run/docker.sock',
			...(ca ? ['-v', `${ca}:/verify-ca.crt:ro`, '-e', 'NODE_EXTRA_CA_CERTS=/verify-ca.crt', '-e', 'SSL_CERT_FILE=/verify-ca.crt'] : []),
			'--stop-timeout', '60', image,
		], {timeout: 600_000})
		saveState({umbrel: version})
	}
	await waitForUmbreld()
	await session(true)
	return loadState()
}

async function waitForUmbreld() {
	for (let i = 0; i < 180; i++) {
		try {
			const r = await fetch(`http://localhost:${UMBREL_PORT}/trpc/user.exists`)
			if (r.ok) return
		} catch {}
		await sleep(1000)
	}
	throw new Error('umbreld did not come up, check `docker logs umbrel-verify`')
}

async function down() {
	const projects = trySh('docker', ['ps', '-a', '--format', '{{.Label "com.docker.compose.project"}}'])?.split('\n') ?? []
	const appContainers = trySh('docker', ['ps', '-aq', '--filter', 'label=com.docker.compose.project'])?.split('\n').filter(Boolean) ?? []
	log(`removing umbrelOS and ${new Set(projects.filter(Boolean)).size} compose projects`)
	trySh('docker', ['rm', '-f', CONTAINER, ...appContainers])
	for (const c of trySh('docker', ['ps', '-aq', '--filter', 'name=^umbrel_'])?.split('\n').filter(Boolean) ?? []) trySh('docker', ['rm', '-f', c])
	fs.rmSync(path.join(HOME, 'data'), {recursive: true, force: true})
	fs.rmSync(STATE_FILE, {force: true})
}

// ── tRPC ─────────────────────────────────────────────────────────────────────

async function session(fresh = false) {
	const state = loadState()
	if (!fresh && state.token) return state
	const exists = await (await fetch(`http://localhost:${UMBREL_PORT}/trpc/user.exists`)).json()
	if (!exists.result?.data) await fetch(`http://localhost:${UMBREL_PORT}/trpc/user.register`, {
		method: 'POST',
		headers: {'content-type': 'application/json'},
		body: JSON.stringify({name: 'Verify', password: PASSWORD}),
	})
	const r = await fetch(`http://localhost:${UMBREL_PORT}/trpc/user.login`, {
		method: 'POST',
		headers: {'content-type': 'application/json'},
		body: JSON.stringify({password: PASSWORD}),
	})
	const body = await r.json()
	if (!body.result) throw new Error(`login failed: ${JSON.stringify(body.error?.message ?? body)}`)
	state.token = body.result.data
	state.cookies = r.headers.getSetCookie().map((c) => c.split(';')[0])
	saveState(state)
	return state
}

async function trpc(proc, input, {mutation = false} = {}) {
	const s = await session()
	const headers = {authorization: `Bearer ${s.token}`, cookie: s.cookies.join('; '), 'content-type': 'application/json'}
	const url = `http://localhost:${UMBREL_PORT}/trpc/${proc}`
	const r = mutation
		? await fetch(url, {method: 'POST', headers, body: JSON.stringify(input ?? {})})
		: await fetch(input === undefined ? url : `${url}?input=${encodeURIComponent(JSON.stringify(input))}`, {headers})
	const body = await r.json()
	if (body.error) throw new Error(`${proc}: ${body.error.message}`)
	return body.result.data
}

// ── Store: serve the working tree over smart HTTP ────────────────────────────

function snapshot() {
	const index = path.join(HOME, 'snapshot.index')
	const env = {...process.env, GIT_INDEX_FILE: index}
	fs.rmSync(index, {force: true})
	sh('git', ['-C', REPO, 'read-tree', 'HEAD'], {env})
	sh('git', ['-C', REPO, 'add', '-A'], {env})
	const tree = sh('git', ['-C', REPO, 'write-tree'], {env})
	const dirty = tree !== sh('git', ['-C', REPO, 'rev-parse', 'HEAD^{tree}'])
	const commit = sh('git', ['-C', REPO, 'commit-tree', tree, '-m', 'verify snapshot'], {
		env: {...process.env, GIT_AUTHOR_NAME: 'verify', GIT_AUTHOR_EMAIL: 'verify@localhost', GIT_COMMITTER_NAME: 'verify', GIT_COMMITTER_EMAIL: 'verify@localhost'},
	})
	const bare = path.join(HOME, 'store.git')
	if (!fs.existsSync(bare)) sh('git', ['init', '--bare', '-q', '-b', 'master', bare])
	sh('git', ['-C', REPO, 'push', '-q', '--force', bare, `${commit}:refs/heads/master`])
	const head = sh('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'])
	const branch = trySh('git', ['-C', REPO, 'rev-parse', '--abbrev-ref', 'HEAD'])
	return {tree, label: `${branch}@${head}${dirty ? '+dirty' : ''}`}
}

function serveGit() {
	const server = http.createServer((req, res) => {
		const u = new URL(req.url, 'http://x')
		const env = {
			...process.env,
			GIT_PROJECT_ROOT: HOME,
			GIT_HTTP_EXPORT_ALL: '1',
			PATH_INFO: u.pathname,
			QUERY_STRING: u.search.slice(1),
			REQUEST_METHOD: req.method,
			CONTENT_TYPE: req.headers['content-type'] ?? '',
			REMOTE_ADDR: req.socket.remoteAddress ?? '',
		}
		for (const [k, v] of Object.entries(req.headers)) env[`HTTP_${k.toUpperCase().replace(/-/g, '_')}`] = String(v)
		const cgi = spawn('git', ['http-backend'], {env})
		req.pipe(cgi.stdin)
		let buf = Buffer.alloc(0)
		let headersDone = false
		cgi.stdout.on('data', (chunk) => {
			if (headersDone) return res.write(chunk)
			buf = Buffer.concat([buf, chunk])
			const end = buf.indexOf('\r\n\r\n')
			if (end === -1) return
			headersDone = true
			let status = 200
			for (const line of buf.subarray(0, end).toString().split('\r\n')) {
				const i = line.indexOf(':')
				const k = line.slice(0, i).trim()
				const v = line.slice(i + 1).trim()
				if (k.toLowerCase() === 'status') status = parseInt(v)
				else res.setHeader(k, v)
			}
			res.writeHead(status)
			res.write(buf.subarray(end + 4))
		})
		cgi.on('close', () => res.end())
	})
	return new Promise((resolve) => server.listen(GIT_PORT, '0.0.0.0', () => resolve(server)))
}

function storeUrl() {
	const gw = process.platform === 'darwin'
		? 'host.docker.internal'
		: sh('docker', ['inspect', '-f', '{{range .NetworkSettings.Networks}}{{.Gateway}} {{end}}', CONTAINER]).split(' ')[0]
	return `http://${gw}:${GIT_PORT}/store.git`
}

const REMOTE_URL = () =>
	sh('git', ['-C', REPO, 'remote', 'get-url', 'origin']).replace(/^git@github\.com:/, 'https://github.com/').replace(/(\.git)?$/, '.git')

async function publishStore({remote = false} = {}) {
	const state = loadState()
	let url, label, key
	if (remote) {
		url = REMOTE_URL()
		label = `${url.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')} (default branch)`
		key = url
	} else {
		const snap = snapshot()
		url = storeUrl()
		label = snap.label
		key = snap.tree
	}
	const repos = await trpc('appStore.repositories')
	const urls = repos.map((r) => (typeof r === 'string' ? r : r.url)).filter((u) => !u.includes('getumbrel/umbrel-apps'))
	if (state.storeKey === key && urls.includes(url)) return {label, url}
	for (const u of urls) await trpc('appStore.removeRepository', {url: u}, {mutation: true})
	log(`publishing store ${label}`)
	await trpc('appStore.addRepository', {url}, {mutation: true})
	saveState({...loadState(), storeKey: key, storeLabel: label})
	return {label, url}
}

// ── Apps ─────────────────────────────────────────────────────────────────────

const appContainers = (appId) =>
	(trySh('docker', ['ps', '-a', '--filter', `label=com.docker.compose.project=${appId}`, '--format', '{{json .}}']) ?? '')
		.split('\n')
		.filter(Boolean)
		.map((l) => JSON.parse(l))

async function install(appId, timeoutMs = 900_000) {
	const st = await trpc('apps.state', {appId})
	if (st.state !== 'not-installed') {
		log(`${appId} already installed (${st.state})`)
		return
	}
	log(`installing ${appId}`)
	const t0 = Date.now()
	for (let attempt = 1; ; attempt++) {
		try {
			await trpc('apps.install', {appId}, {mutation: true})
			break
		} catch (e) {
			if (attempt >= 4 || !/429 Too Many Requests|toomanyrequests/i.test(e.message)) throw e
			log(`registry rate limit, retrying ${appId} in ${30 * attempt}s`)
			await sleep(30_000 * attempt)
		}
	}
	for (;;) {
		const s = await trpc('apps.state', {appId})
		if (['ready', 'running'].includes(s.state)) break
		if (['not-installed', 'unknown'].includes(s.state) || Date.now() - t0 > timeoutMs)
			throw new Error(`install of ${appId} ended in state ${s.state}\n${await appLogs(appId)}`)
		await sleep(3000)
	}
	log(`${appId} installed in ${Math.round((Date.now() - t0) / 1000)}s`)
}

async function uninstall(appId) {
	if ((await trpc('apps.state', {appId})).state === 'not-installed') return
	log(`uninstalling ${appId}`)
	await trpc('apps.uninstall', {appId}, {mutation: true})
	for (let i = 0; i < 120 && (await trpc('apps.state', {appId})).state !== 'not-installed'; i++) await sleep(2000)
}

async function appLogs(appId, bytes = 20_000) {
	return trySh('docker', ['logs', '--tail', '200', CONTAINER])?.split('\n').filter((l) => l.includes(appId)).join('\n') +
		'\n' + appContainers(appId).map((c) => `── ${c.Names} (${c.Status})\n${(trySh('sh', ['-c', `docker logs --tail 40 ${c.Names} 2>&1`]) ?? '').slice(-bytes)}`).join('\n')
}

async function waitHealthy(appId, timeoutMs, {ignoreHealth = false} = {}) {
	const t0 = Date.now()
	let last = ''
	for (;;) {
		const cs = appContainers(appId)
		const bad = cs.filter((c) => /Exited \((?!0\))/.test(c.Status) || /Restarting/.test(c.Status) || /Dead/.test(c.State))
		const pending = cs.filter((c) => (!ignoreHealth && /health: starting/.test(c.Status)) || c.State === 'created')
		const unhealthy = cs.filter((c) => !ignoreHealth && /\(unhealthy\)/.test(c.Status))
		last = cs.map((c) => `${c.Names}: ${c.Status}`).join(', ')
		if (bad.length && Date.now() - t0 > 20_000) throw new Error(`containers crashed: ${last}\n${await appLogs(appId)}`)
		if (cs.length && !bad.length && !pending.length && !unhealthy.length) return cs
		if (Date.now() - t0 > timeoutMs) throw new Error(`containers not healthy after ${timeoutMs / 1000}s: ${last}\n${await appLogs(appId)}`)
		await sleep(3000)
	}
}

const TRUST_STORES = ['/etc/ssl/certs/ca-certificates.crt', '/etc/ssl/cert.pem', '/etc/pki/tls/certs/ca-bundle.crt']

async function trustProxyCA(appId) {
	const ca = caBundle()
	if (!ca) return
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-ca-'))
	const patched = []
	for (const c of appContainers(appId).filter((c) => c.State === 'running')) {
		for (const store of TRUST_STORES) {
			const local = path.join(tmp, 'bundle.crt')
			if (trySh('docker', ['cp', '-L', `${c.Names}:${store}`, local]) === null) continue
			fs.appendFileSync(local, '\n' + fs.readFileSync(ca, 'utf8'))
			if (trySh('docker', ['cp', local, `${c.Names}:${store}`]) !== null) patched.push(`${c.Names}:${store}`)
		}
		trySh('docker', ['restart', c.Names])
	}
	fs.rmSync(tmp, {recursive: true, force: true})
	log(`egress: proxy CA added to ${patched.length ? patched.join(', ') : 'no trust store'}, containers restarted`)
}

const FIXTURES = {
	movie: 'movies/Test Pattern (2026)/Test Pattern (2026).mkv',
	show: 'shows/Test Show/Season 01/Test Show - S01E01 - Pilot.mkv',
}

function downloadsDir() {
	for (const d of ['home/Downloads', 'storage/downloads']) if (fs.existsSync(path.join(HOME, 'data', d))) return path.join(HOME, 'data', d)
	return path.join(HOME, 'data', 'home', 'Downloads')
}

function placeFixtures(names) {
	if (!names?.length) return
	const sample = path.join(HOME, 'fixtures', 'sample.mkv')
	if (!fs.existsSync(sample)) {
		if (!trySh('which', ['ffmpeg'])) throw new Error('fixtures need ffmpeg on the host')
		fs.mkdirSync(path.dirname(sample), {recursive: true})
		sh('ffmpeg', [
			'-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=25:duration=120',
			'-f', 'lavfi', '-i', 'sine=frequency=440:duration=120', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '35',
			'-c:a', 'aac', '-shortest', '-metadata:s:a:0', 'language=eng', `${sample}.tmp.mkv`,
		], {timeout: 300_000})
		fs.renameSync(`${sample}.tmp.mkv`, sample)
	}
	const dl = downloadsDir()
	for (const name of names) {
		const rel = FIXTURES[name]
		if (!rel) throw new Error(`unknown fixture "${name}" (known: ${Object.keys(FIXTURES).join(', ')})`)
		fs.mkdirSync(path.dirname(path.join(dl, rel)), {recursive: true})
		fs.copyFileSync(sample, path.join(dl, rel))
		if (process.getuid?.() === 0) trySh('chown', ['-R', '1000:1000', path.join(dl, rel.split('/')[0])])
	}
	log(`fixtures: ${names.map((n) => `/downloads/${FIXTURES[n]}`).join(', ')}`)
}

const appDataDir = (id) => path.join(HOME, 'data', 'app-data', id)
const checkpointDir = (id) => path.join(HOME, 'checkpoints', id)

function checkpointKey(appId, flow, umbrel) {
	const h = crypto.createHash('sha256')
	const walk = (dir) => {
		for (const f of fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
			const full = path.join(dir, f.name)
			if (f.isDirectory()) walk(full)
			else h.update(path.relative(REPO, full)).update(fs.readFileSync(full))
		}
	}
	walk(path.join(REPO, appId))
	const {requires, prepare, setup, vars, fixtures, egress} = flow
	h.update(JSON.stringify({requires, prepare, setup, vars, fixtures, egress, umbrel}))
	return h.digest('hex').slice(0, 16)
}

function withStopped(apps, fn) {
	const names = apps.flatMap((a) => appContainers(a).map((c) => c.Names))
	if (names.length) sh('docker', ['stop', '-t', '30', ...names], {timeout: 300_000})
	try {
		fn()
	} finally {
		if (names.length) sh('docker', ['start', ...names])
	}
}

function saveCheckpoint(appId, apps, key) {
	const dir = checkpointDir(appId)
	fs.rmSync(dir, {recursive: true, force: true})
	fs.mkdirSync(dir, {recursive: true})
	withStopped(apps, () => {
		for (const a of apps) sh('cp', ['-a', appDataDir(a), path.join(dir, a)])
	})
	fs.writeFileSync(path.join(dir, 'key'), key)
	log(`checkpoint saved (${apps.join(', ')})`)
}

const hasCheckpoint = (appId, key) => trySh('cat', [path.join(checkpointDir(appId), 'key')]) === key

function restoreCheckpoint(appId, apps) {
	withStopped(apps, () => {
		for (const a of apps) {
			fs.rmSync(appDataDir(a), {recursive: true, force: true})
			sh('cp', ['-a', path.join(checkpointDir(appId), a), appDataDir(a)])
		}
	})
	log(`restored ${apps.join(', ')} from checkpoint`)
}

async function waitLogs(appId, expectations, timeoutMs) {
	const t0 = Date.now()
	for (const [service, pattern] of Object.entries(expectations ?? {})) {
		const name = `${appId}_${service}_1`
		const re = new RegExp(pattern, 'm')
		for (;;) {
			const out = trySh('sh', ['-c', `docker logs ${name} 2>&1`]) ?? ''
			if (re.test(out)) {
				log(`log ok: ${service} ~ /${pattern}/`)
				break
			}
			if (Date.now() - t0 > timeoutMs) throw new Error(`log /${pattern}/ never appeared in ${name}\n${out.slice(-3000)}`)
			await sleep(2000)
		}
	}
}

async function waitHttp(port, timeoutMs) {
	const t0 = Date.now()
	let last
	for (;;) {
		try {
			const r = await fetch(`http://localhost:${port}/`, {redirect: 'manual'})
			if (r.status < 500) return r.status
			last = `HTTP ${r.status}`
		} catch (e) {
			last = e.cause?.code ?? e.message
		}
		if (Date.now() - t0 > timeoutMs) throw new Error(`port ${port} never answered (${last})`)
		await sleep(2000)
	}
}

// ── Browser ──────────────────────────────────────────────────────────────────

async function playwright() {
	try {
		return await import('playwright')
	} catch {}
	const roots = [trySh('npm', ['root', '-g']), '/opt/node-tools/node_modules'].filter(Boolean)
	for (const root of roots) {
		const p = path.join(root, 'playwright', 'index.mjs')
		if (fs.existsSync(p)) return import(pathToFileURL(p).href)
	}
	return createRequire(import.meta.url)('playwright')
}

async function launch() {
	const {chromium} = await playwright()
	return chromium.launch()
}

async function login(b) {
	const ctx = await b.newContext({viewport: {width: 1440, height: 900}, locale: 'en-US'})
	const page = await ctx.newPage()
	await page.goto(`http://localhost:${UMBREL_PORT}/login`)
	await page.locator('input[type=password]').fill(PASSWORD)
	await page.keyboard.press('Enter')
	await page.waitForURL((u) => !u.pathname.startsWith('/login'), {timeout: 30_000})
	await settle(page)
	return {ctx, page}
}

async function browser() {
	const b = await launch()
	return {b, ...(await login(b))}
}

// Wait for the page to go quiet instead of a fixed sleep; SPAs that poll never reach networkidle,
// hence the cap.
const settle = (page, ms = 6000) => page.waitForLoadState('networkidle', {timeout: ms}).catch(() => {}).then(() => page.waitForTimeout(300))

// Luminance spread of a screenshot: ~0 for a blank page (white, black, a lone spinner on a flat
// background). A proof whose main image is blank proves nothing, whatever the steps asserted.
async function blankness(ctx, file) {
	const page = await ctx.newPage()
	try {
		await page.setContent(`<img id="i" src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}">`)
		return await page.evaluate(async () => {
			const img = document.getElementById('i')
			await img.decode()
			const c = document.createElement('canvas')
			c.width = 720
			c.height = 450
			const g = c.getContext('2d')
			g.drawImage(img, 0, 0, c.width, c.height)
			const d = g.getImageData(0, 0, c.width, c.height).data
			let sum = 0
			let sq = 0
			for (let i = 0; i < d.length; i += 4) {
				const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
				sum += l
				sq += l * l
			}
			const n = d.length / 4
			return Math.sqrt(sq / n - (sum / n) ** 2)
		})
	} finally {
		await page.close()
	}
}

function locate(page, spec) {
	if (typeof spec === 'string') return page.getByText(spec).first()
	const opts = spec.exact ? {exact: true} : {}
	if (spec.css) return (spec.text ? page.locator(spec.css).filter({hasText: spec.text}) : page.locator(spec.css)).first()
	if (spec.role) return page.getByRole(spec.role, {name: spec.name, ...opts}).first()
	if (spec.label) return page.getByLabel(spec.label, opts).first()
	if (spec.placeholder) return page.getByPlaceholder(spec.placeholder, opts).first()
	if (spec.text) return page.getByText(spec.text, opts).first()
	throw new Error(`cannot locate ${JSON.stringify(spec)}`)
}

async function resolveVars(vars, timeoutMs = 120_000) {
	const out = {}
	for (const [k, cmd] of Object.entries(vars ?? {})) {
		const t0 = Date.now()
		while (!(out[k] = trySh('sh', ['-c', cmd]))) {
			if (Date.now() - t0 > timeoutMs) throw new Error(`var ${k} stayed empty: ${cmd}`)
			await sleep(2000)
		}
	}
	return out
}

async function runCommands(label, cmds, vars, timeoutMs) {
	for (const cmd of cmds ?? []) {
		const t0 = Date.now()
		for (;;) {
			try {
				const out = sh('sh', ['-c', cmd], {env: {...process.env, ...vars}})
				log(`${label}: ${cmd.split('\n')[0].slice(0, 100)}${out ? ` → ${out.split('\n').at(-1).slice(0, 100)}` : ''}`)
				break
			} catch (e) {
				if (Date.now() - t0 > timeoutMs) throw new Error(`${label} command failed: ${cmd}\n${e.stderr || e.message}`)
				await sleep(3000)
			}
		}
	}
}

function interpolate(value, appId, vars = {}) {
	return String(value).replace(/\$\{(\w+)\}/g, (m, k) => vars[k] ?? m).replace(/\$\{env\.(\w+)\.(\w+)\}/g, (_, service, name) => {
		const env = JSON.parse(sh('docker', ['inspect', '-f', '{{json .Config.Env}}', `${appId}_${service}_1`]))
		const hit = env.find((e) => e.startsWith(`${name}=`))
		if (!hit) throw new Error(`env ${name} not set on ${appId}_${service}_1`)
		return hit.slice(name.length + 1)
	})
}

function pageErrors(page) {
	if (page.verifyErrors) return page.verifyErrors
	const errors = (page.verifyErrors = [])
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.split('\n')[0]}`))
	page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 200)}`))
	page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`))
	return errors
}

async function seeWithReload(page, spec, timeoutMs = 120_000) {
	const t0 = Date.now()
	for (;;) {
		try {
			return await locate(page, spec).waitFor({state: 'visible', timeout: 5000})
		} catch (e) {
			if (Date.now() - t0 > timeoutMs) throw e
			await page.reload({waitUntil: 'domcontentloaded'})
		}
	}
}

async function runSteps(ctx, appId, port, steps, out, {page, final = true, vars = {}, timeout = 30_000} = {}) {
	page ??= await ctx.newPage()
	const origin = `http://localhost:${port}`
	const shots = []
	const shoot = async (name) => {
		const file = path.join(out, `${appId}.${String(shots.length + 3).padStart(2, '0')}-${name}.png`)
		await page.screenshot({path: file})
		shots.push(file)
	}
	page.setDefaultTimeout(timeout)
	const errors = pageErrors(page)
	let mcpSession
	if (!steps?.length) steps = [{goto: '/'}, {wait: 4000}]
	for (const [i, step] of steps.entries()) {
		const [type, raw] = Object.entries(step)[0]
		const arg = typeof raw === 'string' ? interpolate(raw, appId, vars) : raw
		log(`step ${i + 1}: ${type} ${typeof arg === 'string' ? arg : JSON.stringify(arg)}`)
		try {
			switch (type) {
				case 'goto':
					await page.goto(/^https?:/.test(arg) ? arg.replace(/^http:\/\/localhost\//, `http://localhost:${UMBREL_PORT}/`) : origin + arg, {waitUntil: 'domcontentloaded'})
					break
				case 'see':
					if (arg.reload) await seeWithReload(page, arg)
					else await locate(page, arg).waitFor({state: 'visible'})
					break
				case 'click':
					await locate(page, arg).click()
					break
				case 'fill':
					await locate(page, arg).fill(interpolate(arg.value, appId, vars))
					break
				case 'select':
					await locate(page, arg).selectOption(arg.value)
					break
				case 'check':
					await locate(page, arg).check()
					break
				case 'press':
					await page.keyboard.press(arg)
					break
				case 'wait':
					await page.waitForTimeout(Number(arg))
					break
				case 'url':
					await page.waitForURL(new RegExp(arg))
					break
				case 'shot':
					await shoot(arg)
					break
				case 'mock':
					await page.route(`${origin}${arg.path}*`, (route) =>
						route.fulfill({status: arg.status ?? 200, contentType: 'application/json', body: JSON.stringify(arg.body ?? {})}),
					)
					break
				case 'http': {
					const headers = Object.fromEntries(Object.entries(arg.headers ?? {}).map(([k, v]) => [k, interpolate(v, appId, vars)]))
					if (mcpSession && !Object.keys(headers).some((k) => k.toLowerCase() === 'mcp-session-id')) headers['mcp-session-id'] = mcpSession
					const url = origin + interpolate(arg.path ?? '/', appId, vars)
					const body = arg.body === undefined ? undefined : interpolate(typeof arg.body === 'string' ? arg.body : JSON.stringify(arg.body), appId, vars)
					const r = arg.anonymous
						? await (async () => {
								const res = await fetch(url, {method: arg.method ?? 'GET', headers, body, redirect: 'manual'})
								return {status: res.status, text: () => res.text(), session: res.headers.get('mcp-session-id')}
							})()
						: await (async () => {
								const res = await page.request.fetch(url, {method: arg.method ?? 'GET', headers, data: body, maxRedirects: 0, timeout: 120_000})
								return {status: res.status(), text: () => res.text(), session: res.headers()['mcp-session-id']}
							})()
					if (r.session) mcpSession = r.session
					const text = await r.text()
					const esc = (v) => String(v).replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[c])
					const pretty = (() => {
						try {
							return JSON.stringify(JSON.parse(text.replace(/^(event|id):.*$/gm, '').replace(/^data: ?/gm, '')), null, 2)
						} catch {
							return text
						}
					})()
					await page.setContent(`<body style="margin:0;padding:28px;background:#0f1117;color:#d8dbe2;font:14px ui-monospace,monospace">
<div style="color:#8b93a7">${esc(arg.method ?? 'GET')} ${esc(url)}${arg.anonymous ? ' (no umbrelOS session)' : ''}</div>
${body === undefined ? '' : `<pre style="color:#8b93a7">${esc(body)}</pre>`}
<div style="margin:14px 0;font-size:18px;color:${r.status < 400 ? '#4ade80' : '#f87171'}">HTTP ${r.status}</div>
<pre style="white-space:pre-wrap">${esc(pretty.slice(0, 6000))}</pre></body>`)
					if (arg.status && r.status !== arg.status) throw new Error(`expected HTTP ${arg.status}, got ${r.status}: ${text.slice(0, 300)}`)
					if (arg.contains && !new RegExp(arg.contains).test(text)) throw new Error(`response does not match /${arg.contains}/: ${text.slice(0, 300)}`)
					log(`  HTTP ${r.status} ${text.slice(0, 120).replace(/\s+/g, ' ')}`)
					break
				}
				default:
					throw new Error(`unknown step type "${type}"`)
			}
		} catch (e) {
			await shoot(`failed-step-${i + 1}`).catch(() => {})
			const body = (await page.innerText('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)
			const detail = [`url: ${page.url()}`, `page text: ${body}`, ...errors.slice(-15)].join('\n  ')
			throw Object.assign(new Error(`step ${i + 1} (${type}) failed: ${e.message.split('\n')[0]}\n  ${detail}`), {shots})
		}
	}
	if (final && !('shot' in steps.at(-1))) await shoot('final')
	if (errors.length) log(`page reported ${errors.length} error(s):\n  ${errors.slice(-10).join('\n  ')}`)
	return shots
}

async function umbrelShots(page, appId, out) {
	const files = []
	await page.goto(`http://localhost:${UMBREL_PORT}/community-app-store/${appId.split('-')[0]}`)
	await settle(page)
	await page.getByText(readYaml(path.join(REPO, appId, 'umbrel-app.yml')).name, {exact: true}).first().scrollIntoViewIfNeeded().catch(() => {})
	files.push(path.join(out, `${appId}.01-store.png`))
	await page.screenshot({path: files.at(-1)})
	await page.goto(`http://localhost:${UMBREL_PORT}/`)
	await settle(page)
	files.push(path.join(out, `${appId}.02-home.png`))
	await page.screenshot({path: files.at(-1)})
	return files
}

async function proof(ctx, {appId, version, ok, error, store, umbrel, shots, out}) {
	const page = await ctx.newPage()
	await page.setViewportSize({width: 1600, height: 900})
	const imgs = shots.filter((f) => fs.existsSync(f)).map((f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`)
	const main = imgs.at(-1)
	const side = imgs.slice(0, -1).slice(-3)
	const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[c])
	await page.setContent(`<!doctype html><html><body style="margin:0;background:#16181f;color:#e8eaf0;font:15px system-ui,sans-serif">
<div style="padding:18px 24px;display:flex;align-items:center;gap:16px;border-bottom:1px solid #2c303b">
  <div style="font-size:30px">${ok ? '✅' : '❌'}</div>
  <div><div style="font-size:22px;font-weight:600">${esc(appId)} <span style="color:#9aa0ad;font-weight:400">${esc(version)}</span></div>
  <div style="color:#9aa0ad;margin-top:4px">${ok ? 'installed, healthy and set up' : esc(error).slice(0, 300)} · umbrelOS ${esc(umbrel)} · store ${esc(store)} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</div></div>
</div>
<div style="display:flex;gap:16px;padding:16px 24px">
  <img src="${main}" style="width:1100px;border-radius:10px;border:1px solid #2c303b">
  <div style="display:flex;flex-direction:column;gap:12px">${side.map((s) => `<img src="${s}" style="width:420px;border-radius:8px;border:1px solid #2c303b">`).join('')}</div>
</div></body></html>`)
	const file = path.join(out, `${appId}.proof.png`)
	await page.screenshot({path: file, fullPage: true})
	return file
}

function recordVerified(appId, version, umbrel) {
	const file = path.join(FLOWS_DIR, `${appId}.yml`)
	if (!fs.existsSync(file)) return
	const line = `verified: ${version} on umbrelOS ${umbrel} (${new Date().toISOString().slice(0, 10)})`
	const src = fs.readFileSync(file, 'utf8')
	fs.writeFileSync(file, /^verified:.*$/m.test(src) ? src.replace(/^verified:.*$/m, line) : `${line}\n${src}`)
}

// The proof's main image is the last shot: it must follow an assertion on what it shows, or
// it can be a blank page caught mid-load or the wrong screen, and still pass.
function lintFlow(appId, flow) {
	const steps = flow?.steps ?? []
	const last = steps.findLastIndex((st) => 'shot' in st)
	if (last < 0) return
	const before = steps[last - 1]
	if (!before || !('see' in before || 'http' in before))
		throw new Error(`flows/${appId}.yml: the last shot must come right after a \`see\` (or an \`http\` whose response is the proof), not ${before ? Object.keys(before)[0] : 'nothing'}`)
}

const readFlow = (appId) => {
	const file = path.join(FLOWS_DIR, `${appId}.yml`)
	return fs.existsSync(file) ? readYaml(file) : null
}

const BLANK = 4

// One app: fresh install, checks, flow in its own logged-in browser context, proof image.
// Its `requires` are installed beforehand by `run`, once for every app of the run.
async function verify(appId, flow, flags, b, {keepInstalled = false} = {}) {
	const t0 = Date.now()
	const manifest = readYaml(path.join(REPO, appId, 'umbrel-app.yml'))
	const out = path.resolve(flags.out ?? path.join(REPO, '.verify-out'))
	fs.mkdirSync(out, {recursive: true})
	for (const f of fs.readdirSync(out)) if (f.startsWith(`${appId}.`)) fs.rmSync(path.join(out, f))
	// One budget for the whole app (install → checks → flow), not per wait: a stuck app fails
	// after `timeout` seconds (default 300) with its containers' state and logs, and the run
	// moves on instead of piling up 5-minute waits.
	const budget = (flow?.timeout ?? 300) * 1000
	const left = () => Math.max(1000, budget - (Date.now() - t0))
	const state = loadState()
	const result = {appId, version: manifest.version, umbrel: state.umbrel, store: state.storeLabel, hash: appHash(appId), shots: [], out}
	if (!flow) say(`⚠ no flow at flows/${appId}.yml — generic checks only`)
	let session
	let stage = 'install'
	let timer
	const body = (async () => {
		await uninstall(appId)
		await runCommands('prepare', flow?.prepare, {}, left())
		await install(appId, left())
		if (flow?.egress) await trustProxyCA(appId)
		const health = {ignoreHealth: flow?.ignoreHealth}
		stage = 'containers healthy'
		await waitHealthy(appId, left(), health)
		placeFixtures(flow?.fixtures)
		stage = 'vars'
		const vars = await resolveVars(flow?.vars, left())
		if (flow?.setup) {
			stage = 'setup commands'
			await runCommands('setup', flow.setup, vars, left())
			await waitHealthy(appId, left(), health)
		}
		stage = 'logs'
		await waitLogs(appId, flow?.logs, left())
		stage = 'HTTP on the app port'
		if (!flow?.headless) log(`port ${manifest.port} answers HTTP ${await waitHttp(manifest.port, left())}`)
		stage = 'flow steps'
		session = await login(b)
		result.shots.push(...(await umbrelShots(session.page, appId, out)))
		result.shots.push(...(await runSteps(session.ctx, appId, manifest.port, flow?.steps, out, {vars})))
		const spread = await blankness(session.ctx, result.shots.at(-1))
		if (spread < BLANK && !flow?.allowBlank)
			throw Object.assign(new Error(`the proof's main screenshot is blank (luminance spread ${spread.toFixed(1)}): the page wasn't rendered yet or is empty — add a \`see\` for what it must show before the last shot`), {shots: []})
	})()
	const deadline = new Promise((_, reject) => {
		timer = setTimeout(async () => {
			const shots = []
			if (session) {
				const file = path.join(out, `${appId}.99-timeout.png`)
				if (await session.page.screenshot({path: file}).then(() => true, () => false)) shots.push(file)
			}
			reject(Object.assign(new Error(`timed out after ${budget / 1000}s waiting for ${stage}\n${await appLogs(appId, 3000)}`), {shots}))
		}, budget)
	})
	try {
		await Promise.race([body, deadline])
		result.ok = true
	} catch (e) {
		result.ok = false
		result.error = e.message
		result.shots.push(...(e.shots ?? []))
		log(`✗ ${e.message}`)
	} finally {
		clearTimeout(timer)
		body.catch(() => {})
	}
	const ctx = session?.ctx ?? (await b.newContext())
	result.proof = await proof(ctx, result).catch((e) => log(`proof image failed: ${e.message}`))
	await ctx.close()
	fs.writeFileSync(path.join(out, `${appId}.result.json`), JSON.stringify(result, null, 2))
	if (result.ok && flow && !flags['no-record'] && !flags.remote) recordVerified(appId, manifest.version, result.umbrel)
	if (!flags.keep && !keepInstalled) await uninstall(appId).catch((e) => log(`uninstall: ${e.message}`))
	result.seconds = Math.round((Date.now() - t0) / 1000)
	say(`${result.ok ? '✅' : '❌'} ${manifest.version} in ${result.seconds}s${result.ok ? '' : ` — ${result.error.split('\n')[0]}`}`)
	return result
}

function semaphore(n) {
	const queue = []
	let free = n
	return {
		acquire: () => (free > 0 ? (free--, Promise.resolve()) : new Promise((r) => queue.push(r))),
		release: () => (queue.length ? queue.shift()() : free++),
	}
}

// All proofs on one image, so a run is checked with a single look.
async function contactSheet(b, results, out) {
	const items = results.filter((r) => r.proof && fs.existsSync(r.proof))
	if (!items.length) return null
	const ctx = await b.newContext({viewport: {width: 1640, height: 900}})
	const page = await ctx.newPage()
	const cells = items.map((r) => `<img src="data:image/png;base64,${fs.readFileSync(r.proof).toString('base64')}" style="width:800px;border-radius:8px;border:1px solid #2c303b">`)
	await page.setContent(`<body style="margin:0;padding:12px;background:#0d0f14;display:grid;grid-template-columns:repeat(2,800px);gap:12px">${cells.join('')}</body>`)
	const file = path.join(out, 'summary.png')
	await page.screenshot({path: file, fullPage: true})
	await ctx.close()
	return file
}

async function run(apps, flags) {
	const t0 = Date.now()
	for (const a of apps) if (!fs.existsSync(path.join(REPO, a, 'umbrel-app.yml'))) throw new Error(`no app folder ${a}`)
	const flows = Object.fromEntries(apps.map((a) => [a, readFlow(a)]))
	for (const a of apps) lintFlow(a, flows[a])
	const out = path.resolve(flags.out ?? path.join(REPO, '.verify-out'))
	fs.mkdirSync(out, {recursive: true})
	output.quiet = !flags.verbose
	output.file = path.join(out, 'run.log')
	fs.writeFileSync(output.file, '')
	const jobs = Math.max(1, Number(flags.jobs ?? 3))
	say(`verifying ${apps.join(', ')} (${jobs} at a time) — details in ${output.file}`)
	await up(flags.umbrel)
	const git = flags.remote ? null : await serveGit()
	try {
		const store = await publishStore(flags)
		say(`umbrelOS ${loadState().umbrel} ready, store ${store.label}`)

		const requires = (a) => flows[a]?.requires ?? []
		const deps = [...new Set(apps.flatMap(requires))].filter((d) => !apps.includes(d))
		if (deps.length) {
			const td = Date.now()
			const failed = []
			await Promise.all(deps.map((d) => appScope.run(d, async () => {
				try {
					await install(d, 300_000)
					await waitHealthy(d, 300_000)
				} catch (e) {
					failed.push(d)
					log(`✗ ${e.message}`)
				}
			})))
			say(`dependencies ${failed.length ? `FAILED: ${failed.join(', ')} (see run.log), ok: ` : 'ready: '}${deps.filter((d) => !failed.includes(d)).join(', ') || '-'} (${Math.round((Date.now() - td) / 1000)}s)`)
		}

		// An app under test that another one requires is kept installed until the end, and its
		// dependents wait for its own verification.
		const neededByOthers = new Set(apps.flatMap(requires).filter((d) => apps.includes(d)))
		const finished = Object.fromEntries(apps.map((a) => {
			let resolve
			const promise = new Promise((r) => (resolve = r))
			return [a, {promise, resolve}]
		}))
		const sem = semaphore(jobs)
		const b = await launch()
		const results = await Promise.all(apps.map((a) => appScope.run(a, async () => {
			let r
			try {
				const blocked = []
				for (const d of requires(a).filter((d) => finished[d])) if (!(await finished[d].promise).ok) blocked.push(d)
				if (blocked.length) {
					r = {appId: a, ok: false, error: `required app failed: ${blocked.join(', ')}`, out}
					say(`❌ skipped — ${r.error}`)
					return r
				}
				await sem.acquire()
				try {
					r = await verify(a, flows[a], flags, b, {keepInstalled: neededByOthers.has(a)})
				} finally {
					sem.release()
				}
				return r
			} finally {
				finished[a].resolve(r ?? {ok: false})
			}
		})))
		if (!flags.keep) for (const a of neededByOthers) await uninstall(a).catch(() => {})
		if (flags.clean) await Promise.all(deps.map((d) => uninstall(d).catch(() => {})))
		const sheet = await contactSheet(b, results, out)
		await b.close()
		fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(results, null, 2))
		console.log(
			[
				'',
				...results.map((r) => `${r.ok ? '✅' : '❌'} ${r.appId} ${r.version ?? ''}${r.ok ? '' : ` — ${r.error.split('\n')[0]}`}`),
				`${results.filter((r) => r.ok).length}/${results.length} ok in ${Math.round((Date.now() - t0) / 1000)}s`,
				`all proofs: ${sheet ?? '-'} (Read it)   details: ${output.file}`,
			].join('\n'),
		)
		if (flags.pr) attachProofs(results, flags.pr)
		if (results.some((r) => !r.ok)) process.exitCode = 1
	} finally {
		git?.close()
	}
}

async function describe(page, file) {
	await page.screenshot({path: file})
	const info = await page.evaluate(() => {
		const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
		const clean = (t) => (t ?? '').trim().replace(/\s+/g, ' ')
		const dialog = [...document.querySelectorAll('[role=dialog],dialog[open]')].filter(vis).at(-1)
		const scope = dialog ?? document.body
		const prefix = dialog ? '[role=dialog] ' : ''
		let dialogName = null
		if (dialog) {
			const by = dialog.getAttribute('aria-labelledby')
			dialogName = clean(dialog.getAttribute('aria-label') || (by && document.getElementById(by)?.innerText) || dialog.querySelector('h1,h2,h3,h4,h5,h6')?.innerText) || '(unnamed)'
		}
		const allInputs = [...scope.querySelectorAll('input,select,textarea')]
		const inputs = allInputs.filter((el) => vis(el) && el.type !== 'hidden').map((el) => {
			const label = clean(el.labels?.[0]?.innerText || el.getAttribute('aria-label'))
			const tag = el.tagName.toLowerCase()
			const locator = label ? {label} : el.id && !/[:]/.test(el.id) ? {css: `#${el.id}`} : el.placeholder ? {placeholder: el.placeholder} : {css: `${prefix}${tag} >> nth=${allInputs.indexOf(el)}`}
			return {locator, type: el.type || tag, value: clean(el.value).slice(0, 40), disabled: el.disabled}
		})
		const allButtons = [...scope.querySelectorAll('button')]
		const buttons = [...scope.querySelectorAll('button,[role=button],a[href]')].filter(vis).slice(0, 60).map((el) => {
			const name = clean(el.innerText) || clean(el.getAttribute('aria-label')) || clean(el.title)
			const role = el.tagName === 'A' ? 'link' : 'button'
			const icon = el.querySelector('svg[data-testid]')?.dataset.testid
			const locator = name ? {role, name} : el.tagName === 'BUTTON' ? {css: `${prefix}button >> nth=${allButtons.indexOf(el)}`} : el.id ? {css: `#${el.id}`} : null
			return {locator, icon, disabled: el.disabled || el.getAttribute('aria-disabled') === 'true'}
		}).filter((x) => x.locator)
		return {url: location.href, dialog: dialogName, inputs, buttons, text: scope.innerText.slice(0, 1500)}
	})
	const loc = (l) => '{' + Object.entries(l).map(([k, v]) => `${k}: ${/^[\w ./-]+$/.test(v) && !/^\s|\s$/.test(v) ? v : JSON.stringify(v)}`).join(', ') + '}'
	return [
		`url: ${info.url}`,
		...(info.dialog ? [`dialog: ${info.dialog} (inputs and buttons below are inside it)`] : []),
		'inputs:',
		...info.inputs.map((i) => `  ${loc(i.locator)}  ${i.type}${i.value ? ` = ${JSON.stringify(i.value)}` : ''}${i.disabled ? '  (disabled)' : ''}`),
		'buttons:',
		...info.buttons.map((x) => `  ${loc(x.locator)}${x.icon ? `  icon=${x.icon}` : ''}${x.disabled ? '  (disabled)' : ''}`),
		'text:',
		info.text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `  ${l}`).join('\n'),
		`screenshot: ${file}`,
	].join('\n')
}

function serveControl({appId, port, page, ctx, b, out, vars, file, flowFile}) {
	return new Promise((resolve) => {
		const server = http.createServer(async (req, res) => {
			let raw = ''
			for await (const chunk of req) raw += chunk
			const body = JSON.parse(raw || '{}')
			const reply = (o) => res.end(JSON.stringify(o))
			if (body.stop) {
				reply({ok: true, log: 'explore session closed'})
				server.close()
				await b.close()
				return resolve()
			}
			const lines = []
			const origLog = console.log
			console.log = (...a) => lines.push(a.join(' '))
			let ok = true
			let error
			try {
				if (body.text.trim()) {
					const parsed = parseYaml(body.text)
					const steps = Array.isArray(parsed) ? parsed : [parsed]
					await runSteps(ctx, appId, port, steps, out, {page, final: false, vars, timeout: 10_000})
					if (body.append) {
						const t = body.text.trim()
						const yaml = t.startsWith('-') ? t.split('\n').map((l) => `  ${l}`).join('\n') : `  - ${t}`
						const src = fs.readFileSync(flowFile, 'utf8').replace(/\n*$/, '\n')
						const shot = src.match(/^ *- shot:.*\n$/m)
						fs.writeFileSync(flowFile, shot && src.endsWith(shot[0]) ? src.slice(0, -shot[0].length) + yaml + '\n' + shot[0] : src + yaml + '\n')
						lines.push(`appended to ${path.relative(REPO, flowFile)}`)
					}
				}
			} catch (e) {
				ok = false
				error = e.message
			} finally {
				console.log = origLog
			}
			await page.waitForTimeout(500)
			reply({ok, error, log: lines.join('\n'), describe: await describe(page, file).catch((e) => `describe failed: ${e.message}`)})
		})
		server.listen(CONTROL_PORT, '127.0.0.1', () =>
			log(`explore session ready — drive it with: node ${path.relative(REPO, fileURLToPath(import.meta.url))} step '<yaml step>' [--append], end with: step --stop`),
		)
	})
}

function appHash(appId) {
	const h = crypto.createHash('sha256')
	const files = sh('git', ['-C', REPO, 'ls-files', '--cached', '--others', '--exclude-standard', '--', appId, path.relative(REPO, path.join(FLOWS_DIR, `${appId}.yml`))])
		.split('\n')
		.filter((f) => f && fs.existsSync(path.join(REPO, f)))
		.sort()
	for (const f of files) h.update(`${f}\0`).update(fs.readFileSync(path.join(REPO, f), 'utf8').replace(/^verified:.*$/m, '')).update('\0')
	return h.digest('hex')
}

function attachProofs(results, pr) {
	if (!trySh('which', ['uploads'])) return console.error('✗ --pr: uploads CLI missing (npm install -g @buildinternet/uploads@0.56.7)')
	const repo = REMOTE_URL().replace(/^.*github\.com\//, '').replace(/\.git$/, '')
	const listed = trySh('uploads', ['--json', 'list', '--pr', String(pr), '--repo', repo])
	const keys = listed ? JSON.parse(listed.slice(listed.indexOf('{'))).items.map((i) => i.key) : []
	for (const r of results.filter((r) => r.proof)) {
		const alt = `${r.ok ? '✅' : '❌'} ${r.appId} ${r.version} on umbrelOS ${r.umbrel}`
		// GitHub caches embeds by URL: every proof needs a new name, so a re-run never shows the old image
		const hash = crypto.createHash('sha256').update(fs.readFileSync(r.proof)).digest('hex').slice(0, 8)
		const name = `${r.appId}--${r.version}--${r.ok ? 'pass' : 'fail'}--${hash}${path.extname(r.proof)}`
		const old = new RegExp(`/${r.appId.replace(/[.]/g, '\\.')}(\\.proof|--.*--(pass|fail)--[0-9a-f]{8})\\.\\w+$`)
		for (const k of keys.filter((k) => old.test(k))) {
			if (trySh('uploads', ['delete', k]) === null) console.error(`✗ could not delete the previous proof ${k} (the token needs files:delete), it stays in the PR comment`)
		}
		const res = trySh('uploads', ['--json', 'put', r.proof, '--pr', String(pr), '--repo', repo, '--name', name, '--state', r.ok ? 'after' : 'error', '--alt', alt, '--width', '800'])
		const j = res && JSON.parse(res.slice(res.indexOf('{')))
		if (!j?.embedUrl) console.error(`✗ upload of ${r.proof} failed`)
		else if (j.commentError) console.error(`✗ uploaded but the PR comment failed: ${j.commentError.split('\n')[0]}\n  post it yourself: ![${alt}](${j.embedUrl})`)
		else say(`proof on PR #${pr}: ${j.embedUrl}`)
	}
}

function changedApps() {
	const base = trySh('git', ['-C', REPO, 'merge-base', 'HEAD', 'origin/master']) ?? 'HEAD'
	const files = [
		...sh('git', ['-C', REPO, 'diff', '--name-only', base]).split('\n'),
		...sh('git', ['-C', REPO, 'ls-files', '--others', '--exclude-standard']).split('\n'),
	]
	const apps = new Set()
	for (const f of files) {
		const m = f.match(/^(mathieu-[^/]+)\//) ?? f.match(/^\.claude\/skills\/verify-app\/flows\/(mathieu-[^/]+)\.yml$/)
		if (m && fs.existsSync(path.join(REPO, m[1], 'umbrel-app.yml'))) apps.add(m[1])
	}
	return [...apps]
}

const allApps = () => fs.readdirSync(REPO).filter((d) => d.startsWith('mathieu-') && fs.existsSync(path.join(REPO, d, 'umbrel-app.yml')))

// ── CLI ──────────────────────────────────────────────────────────────────────

const USAGE = `usage: verify.mjs <command> [args] [flags]
  run <app-id>... | --changed | --all   install + check + run flow + proof image
      --jobs N      apps verified at the same time (default 3); \`requires\` are installed once, up front
      --clean       also uninstall the \`requires\` apps at the end (kept by default: the next run reuses them)
      --verbose     print every detail instead of milestones (they always go to <out>/run.log)
      --keep        leave the app installed afterwards
      --remote      use the store from GitHub (default branch) instead of the working tree
      --out DIR     where screenshots and proofs go (default .verify-out/)
      --no-record   do not update "verified:" in the flow file
      --umbrel TAG  dockurr/umbrel tag to test against (default ${umbrelVersion(UMBREL_IMAGE)}, e.g. 1.7.4)
      --pr N        upload each proof to PR N with uploads.sh (its bot keeps one comment up to date)
  attach --pr N [<app-id>... | --changed]   upload the proofs of the last runs without running again;
                    refuses a proof when the app or its flow changed since (default: the changed apps)
  explore <app-id> [path]   replay the flow's steps (or open path), then screenshot + list fields/buttons/text
      --fresh       back to the just-installed state: restores a checkpoint in seconds, reinstalls when
                    there is none or the app/flow setup changed (wizards only run once)
      --reinstall   force a real reinstall (and a new checkpoint)
      --no-replay   don't replay the flow's steps, just open / (or path)
      --steps N     replay only the first N steps
      --serve       keep the browser open; drive it with \`step\`
  step '<yaml>'     run step(s) in the --serve session, print the page; --append adds them to the flow
  step --stop       close the --serve session
  up | down | store | install <app-id> | uninstall <app-id> | logs <app-id> | status`

async function main() {
	const [cmd, ...argv] = process.argv.slice(2)
	const {flags, rest} = parseArgs(argv)
	fs.mkdirSync(HOME, {recursive: true})
	switch (cmd) {
		case 'up': {
			await up(flags.umbrel)
			const git = flags.remote ? null : await serveGit()
			await publishStore(flags)
			git?.close()
			log(`umbrelOS ready on http://localhost:${UMBREL_PORT} (password: ${PASSWORD})`)
			break
		}
		case 'down':
			await down()
			break
		case 'store': {
			const git = flags.remote ? null : await serveGit()
			await publishStore(flags)
			git?.close()
			break
		}
		case 'status':
			console.log(JSON.stringify({...loadState(), token: undefined, cookies: undefined}, null, 2))
			console.log(sh('docker', ['ps', '--format', '{{.Names}}\t{{.Status}}\t{{.Ports}}']))
			break
		case 'install':
			await install(rest[0])
			await waitHealthy(rest[0], 300_000)
			break
		case 'uninstall':
			await uninstall(rest[0])
			break
		case 'logs':
			console.log(await appLogs(rest[0], 100_000))
			break
		case 'explore': {
			const [appId, p] = rest
			const manifest = readYaml(path.join(REPO, appId, 'umbrel-app.yml'))
			const flowFile = path.join(FLOWS_DIR, `${appId}.yml`)
			const flow = fs.existsSync(flowFile) ? readYaml(flowFile) : {}
			const health = {ignoreHealth: flow.ignoreHealth}
			const apps = [appId, ...(flow.requires ?? [])]
			await up(flags.umbrel)
			await Promise.all((flow.requires ?? []).map(async (dep) => {
				await install(dep)
				await waitHealthy(dep, 300_000)
			}))
			const key = checkpointKey(appId, flow, loadState().umbrel)
			const installed = (await trpc('apps.state', {appId})).state !== 'not-installed'
			if (flags.fresh && !flags.reinstall && installed && hasCheckpoint(appId, key)) {
				restoreCheckpoint(appId, apps)
				placeFixtures(flow.fixtures)
				for (const a of apps) await waitHealthy(a, 300_000, a === appId ? health : {})
			} else if (flags.fresh || flags.reinstall) {
				const git = await serveGit()
				await publishStore(flags)
				git.close()
				await uninstall(appId)
				await runCommands('prepare', flow.prepare, {}, 300_000)
				await install(appId)
				if (flow.egress) await trustProxyCA(appId)
				await waitHealthy(appId, 300_000, health)
				placeFixtures(flow.fixtures)
				if (flow.setup) {
					await runCommands('setup', flow.setup, await resolveVars(flow.vars), 300_000)
					await waitHealthy(appId, 300_000, health)
				}
				saveCheckpoint(appId, apps, key)
				for (const a of apps) await waitHealthy(a, 300_000, a === appId ? health : {})
			} else {
				await install(appId)
				await waitHealthy(appId, 300_000, health)
			}
			const vars = await resolveVars(flow.vars)
			await waitLogs(appId, flow.logs, 300_000)
			if (!flow.headless) await waitHttp(manifest.port, 300_000)
			const out = path.resolve(flags.out ?? path.join(REPO, '.verify-out'))
			fs.mkdirSync(out, {recursive: true})
			const {b, ctx} = await browser()
			const page = await ctx.newPage()
			page.setDefaultTimeout(30_000)
			let steps = (flow.steps ?? []).filter((st) => !('shot' in st))
			if (flags.steps !== undefined) steps = steps.slice(0, Number(flags.steps))
			if (p || flags['no-replay'] || !steps.length) await page.goto(`http://localhost:${manifest.port}${p ?? '/'}`)
			else {
				try {
					await runSteps(ctx, appId, manifest.port, steps, out, {page, final: false, vars})
				} catch (e) {
					if (!flags.serve) throw e
					console.error(`✗ ${e.message}`)
				}
			}
			await page.waitForTimeout(2000)
			const file = path.join(out, `${appId}.explore.png`)
			console.log(await describe(page, file))
			if (!flags.serve) {
				await b.close()
				break
			}
			await serveControl({appId, port: manifest.port, page, ctx, b, out, vars, file, flowFile})
			break
		}
		case 'step': {
			const body = flags.stop ? {stop: true} : {text: rest.join(' '), append: !!flags.append}
			let r
			try {
				r = await fetch(`http://127.0.0.1:${CONTROL_PORT}/`, {method: 'POST', body: JSON.stringify(body)})
			} catch {
				throw new Error('no explore session: start one with `explore <app-id> --serve` (in the background)')
			}
			const res = await r.json()
			if (res.log) console.log(res.log)
			if (res.error) console.error(`✗ ${res.error}`)
			if (res.describe) console.log(res.describe)
			if (!res.ok) process.exitCode = 1
			break
		}
		case 'attach': {
			if (!flags.pr) throw new Error('attach needs --pr N')
			const out = path.resolve(flags.out ?? path.join(REPO, '.verify-out'))
			const apps = rest.length ? rest : changedApps()
			const results = []
			for (const a of apps) {
				const file = path.join(out, `${a}.result.json`)
				if (!fs.existsSync(file)) throw new Error(`no proof for ${a} in ${out}: \`run ${a}\` first`)
				const r = JSON.parse(fs.readFileSync(file, 'utf8'))
				if (r.hash !== appHash(a)) throw new Error(`${a} or its flow changed since its proof: \`run ${a} --pr ${flags.pr}\` instead`)
				if (!r.proof || !fs.existsSync(r.proof)) throw new Error(`${a}: proof image ${r.proof ?? '-'} is missing`)
				results.push(r)
			}
			attachProofs(results, flags.pr)
			break
		}
		case 'run': {
			const apps = flags.all ? allApps() : flags.changed ? changedApps() : rest
			if (!apps.length) say('no apps to verify')
			else await run(apps, flags)
			break
		}
		default:
			console.log(USAGE)
			process.exitCode = cmd ? 1 : 0
	}
}

main().catch((e) => {
	console.error(`✗ ${e.message}`)
	process.exit(1)
})
