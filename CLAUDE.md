# CLAUDE.md

Guidance for working in this repository.

## What this is

A personal [Umbrel Community App Store](https://github.com/getumbrel/umbrel-apps).
Umbrel users add it by URL and install the apps it publishes.

- Store id: `mathieu` — display name: `Mathieu's Umbrel` (shown in umbrelOS as "Mathieu's Umbrel App Store")
- Defined in `umbrel-app-store.yml`
- This is a personal side project. It is **not** related to Primo (the owner's
  employer). Don't name things after Primo.

## Style

- **Keep files clean — don't add explanatory comments everywhere.** No running
  commentary in `docker-compose.yml`, `renovate.json`, workflows, or `umbrel-app.yml`.
  Only a comment that is load-bearing (e.g. a `# renovate:` annotation) or warns
  of a genuine footgun. Put the "why" in the commit message, not the file.

## Repository layout

```
umbrel-app-store.yml        # store id + name
<app-id>/
  umbrel-app.yml            # store listing metadata
  docker-compose.yml        # the app's services
packages/                   # this store's own code (Bun workspaces): core, widgets, vitals
```

Every app id **must** be prefixed with the store id `mathieu-`.
Example: `mathieu-healarr`. The folder name equals the app id.

Current apps:
- `mathieu-healarr` — Healarr (media library health monitoring, web UI on 3090; *arr apps and scan paths are added by the user in its setup wizard; media read-only at /downloads so the *arr root folders work as scan paths)
- `mathieu-boxarr` — Boxarr (box office tracking, syncs with Radarr; web UI on 8888, host port 8891 — 8888 is the official `influxdb`)
- `mathieu-tracearr` — Tracearr (Plex/Jellyfin/Emby monitoring, web UI on 3000, host port 3009 — 3000 is the official `thunderhub`; single-container "supervised" image with bundled TimescaleDB + Redis; `mem_limit: 3g` as upstream's example: without a limit its entrypoint tunes PostgreSQL for the host's whole RAM; no `ulimits:` since the entrypoint raises nofile itself and a value above dockerd's hard limit stops the container from starting)
- `mathieu-cleanuparr` — Cleanuparr (download queue cleanup for the *arr stack, web UI on 11011)
- `mathieu-profilarr` — Profilarr (quality profiles/custom formats manager for Radarr/Sonarr, web UI on 6868; 2 services: server + optional parser)
- `mathieu-maintainerr` — Maintainerr (rule-based Plex library cleanup, web UI on 6246; the image runs as 1000, so `data/opt-data/.gitkeep` is shipped to pre-own /opt/data)
- `mathieu-agregarr` — Agregarr (Plex collections + Home/Recommended hubs from Trakt/IMDb/TMDb/Letterboxd/Tautulli/Overseerr, web UI on 7171; the maintained `bitr8/agregarr` fork, upstream `agregarr/agregarr` stalled in April 2026; Overseerr-based, Plex OAuth setup wizard, PUID/PGID 1000 + UMASK 022 (upstream: without them it runs as root and its folders break *arr imports), config at /app/config; `host.docker.internal:host-gateway` so the host-network Plex can be added by hand; /downloads mounted for its "Coming Soon" placeholder folders)
- `mathieu-posterizarr` — Posterizarr (poster/title card maker for Plex, FastAPI web UI on 8000, host port 8007; `user: 1000:1000` with `data/{config,assets,assetsbackup,manualassets}/.gitkeep`; Plex at `http://host.docker.internal:32400` via host-gateway, set in its onboarding with Plex OAuth "Auto-Fetch Token"; Sonarr/Radarr webhook `http://mathieu-posterizarr_server_1:8000/api/webhook/arr?api_key=…`)
- `mathieu-labelarr` — Labelarr (TMDb keywords → Plex labels; headless Go daemon, nginx `web` status sidecar on host port 9095; all wiring is `environment:` settings the user fills in: `TMDB_READ_ACCESS_TOKEN`, `PLEX_TOKEN`, `USE_RADARR`/`RADARR_URL`/`RADARR_API_KEY`, same for Sonarr; compose keeps the defaults (`USE_*` false, Umbrel URLs) since umbreld only injects saved settings; Plex reached at `host.docker.internal:32400`; upstream exits on any missing setting or failed connection, so `server` loops `until ./labelarr | tee /data/labelarr.log … sleep 60` and the status page reads that log; `WEBHOOK_ENABLED` on 9090 behind the sidecar, app_proxy whitelists `/webhook` for Plex (host network) at `http://127.0.0.1:9095/webhook`)
- `mathieu-lingarr` — Lingarr (subtitle translation for Radarr/Sonarr, web UI on 9876, host port 9877 — 9876 is the official `sabnzbd`; embedded SQLite, media at /downloads; `user: 1000:1000` (the image has no USER and no PUID support), `hooks/pre-start` hands a root-era /app/config to 1000; Radarr/Sonarr set by the user in Settings → Integrations)
- `mathieu-sublarr` — Sublarr (all-in-one subtitle manager + LLM translator, web UI on 5765; runs as root, drops via gosu; media at /downloads)
- `mathieu-byparr` — Byparr (Cloudflare-bypass proxy, drop-in FlareSolverr replacement for Prowlarr/Jackett, API on 8191, host port 8192 — 8191 is the official `flaresolverr`; no config, Prowlarr points at `http://mathieu-byparr_server_1:8191`; runs a headless browser so `shm_size: 2gb`, and `/tmp` on tmpfs against disk wear (not upstream's `/cache` one: the image ships its stealth Firefox there, a tmpfs hides it and Byparr re-downloads it on every start); the tile shows the FastAPI docs page)
- `mathieu-suggestarr` — SuggestArr (recommendations from Plex/Jellyfin/Emby watch history, requested through Jellyseerr/Overseerr, web UI on 5000, host port 5009 — 5000 is the official `satsale`; TMDb or OpenAI-compatible LLM, setup wizard in-UI; config at /app/config/config_files)
- `mathieu-cross-seed` — cross-seed (automatic cross-seeding across trackers; headless daemon + nginx status sidecar, API on 2468; `user: 1000:1000` like Transmission (upstream requires the torrent client's uid, no PUID support), `hooks/pre-start` hands files left by the root era to 1000; the entrypoint seeds a `config.js` on first run (Transmission client, empty torznab list the user fills in), existing config.js files are never touched; old installs may still spread a frozen `umbrel-autoconfig.json` from the removed auto-wiring)
- `mathieu-trailarr` — Trailarr (auto-downloads trailers for Radarr/Sonarr library, web UI on 7889; login admin/trailarr; config at /config, media at /downloads)
- `mathieu-slskd` — slskd (Soulseek client, web UI on 5030; runs as `user: 1000:1000` so `data/app/.gitkeep` is shipped to pre-own `/app`; SLSKD_REMOTE_CONFIGURATION lets users set Soulseek creds and API keys in-UI; default web login slskd/slskd; downloads to /downloads/soulseek/complete; publishes P2P port 50300)
- `mathieu-soularr` — Soularr (bridges Lidarr wanted list → slskd → Lidarr import, web UI on 8265 with a config editor; ships a seeded `data/config/config.ini` with the Umbrel hosts (lidarr_server_1, mathieu-slskd_server_1) and upstream's placeholder API keys the user replaces; needs slskd + Lidarr)
- `mathieu-sportarr` — Sportarr (sports PVR à la Sonarr/Radarr, host port 1867/web UI 1867; Docker Hub image pinned by multi-arch index digest, linuxserver-style PUID/PGID, config at /config, media at /downloads)
- `mathieu-tdarr` — Tdarr (automated transcoding + library health checks, host port 8267/web UI 8265, Server port 8266; internalNode=true so it transcodes standalone; config split across /app/server + /app/configs + /app/logs, transcode cache at /temp, media at /downloads; GPU through the `GPU` permission)
- `mathieu-kapowarr` — Kapowarr (comic book library manager à la *arr, web UI on 5656; Docker Hub tag has `v` prefix; PUID/PGID 1000, db at /app/db, root folder /downloads/comics)
- `mathieu-chaptarr` — Chaptarr (ebook/audiobook manager, Readarr re-work, web UI on 8789 — not Readarr's 8787, host port 8790 — 8789 is the official `downtify`; no public GitHub repo yet, Docker Hub only; PUID/PGID 1000, config at /config, root folder /downloads/books)
- `mathieu-scryer` — Scryer (whole *arr stack in one Rust binary: movies/series/anime, web UI on 8080, host port 8380; runs as root + PUID/PGID, config at /config, libraries under /downloads for hardlinks)
- `mathieu-weaver` — Weaver (Usenet downloader by the Scryer authors; download+PAR2 repair+extraction in one pipeline, web UI on 9090, host port 9390; bootstrap login `admin` / `${APP_PASSWORD}` + `deterministicPassword` (shown as default credentials, unique per Umbrel) via WEAVER_BOOTSTRAP_LOGIN_* env, only read on first start)
- `mathieu-pulsarr` — Pulsarr (Plex watchlist → Sonarr/Radarr in real time, web UI on 3003, host port 3023 — 3003 is the official `btcpay-server`; PUID/PGID 1000, data at /app/data; `baseUrl`/`port` env pre-set to `http://mathieu-pulsarr_server_1:3003` so *arr webhooks reach it — env overrides the UI value; Sonarr/Radarr added by the user in its UI)
- `mathieu-dispatcharr` — Dispatcharr (IPTV M3U/EPG manager + HDHomeRun emulation, web UI on 9191; AIO image with bundled Postgres + Redis, data at /data; `PROXY_AUTH_ADD: false` because Plex (host network) and IPTV clients hit `/hdhr`, `/output/*`, `/proxy/*` and root-level Xtream paths through app_proxy, and Dispatcharr has its own login; the host-network Plex app can't reach the Umbrel's own LAN IP on app ports, so it must use `http://127.0.0.1:9191/hdhr`)
- `mathieu-arr-mcp` — arr-mcp (MCP server for the whole *arr/Plex/Jellyfin stack, web UI + `/mcp` on 6060, host port 6061 — 6060 is the official `booklore`; claim-on-first-visit login, services added in-UI by the user; app_proxy `PROXY_AUTH_WHITELIST` opens `/mcp*` + `/.well-known/*` so MCP clients bypass Umbrel login with the bearer token)
- `mathieu-freshrss-mcp` — FreshRSS MCP (MCP server for the official `freshrss` app, `/mcp` on host port 6262 → container 8080; the user enables the API in FreshRSS and enters `FRESHRSS_USERNAME`/`FRESHRSS_API_PASSWORD` as `environment:` settings (injected into `server` and `widget`); `deterministicPassword` → `${APP_PASSWORD}` is the bearer `API_KEY`, shown as default credentials; `FRESHRSS_BASE_URL` (article links) built from `${DEVICE_DOMAIN_NAME}`; image is `latest@digest` (upstream has no version tags), so bump `version` with `-patch.N` to ship digest updates; amd64 only; `widget` service (umbrel-widgets image) serves the `unread`/`overview` widgets, and the `web` sidecar's `/freshrss` redirects to FreshRSS on port 3432 so clicking the widget opens it)
- `mathieu-muxarr` — Muxarr (strips unwanted audio/subtitle tracks by remuxing, no re-encode; web UI on 8183, host port 8184 — 8183 is the official `lunalytics`; PUID/PGID 1000, config at /config, media at /downloads; Blazor setup wizard sets the webhook URL to `http://mathieu-muxarr_server_1:8183`)
- `mathieu-neutarr` — NeutArr (maintained, hardened Huntarr fork: periodically triggers searches for missing/cutoff-unmet media in Sonarr/Radarr/Lidarr/Readarr/Whisparr, web UI on 9705; PUID/PGID 1000, config at /config; `NEUTARR_SETUP_TOKEN: ${APP_PASSWORD}` + `deterministicPassword` so the first-run setup token is the default password shown by umbrelOS instead of a token buried in the logs)
- `mathieu-tunarr` — Tunarr (live TV channels built from Plex/Jellyfin/Emby or local folders, web UI on 8000, host port 8023 — 8020 is the official `super-productivity`; runs as root, config at /config/tunarr, media at /downloads read-only; app_proxy `PROXY_AUTH_WHITELIST` opens only the HDHomeRun/M3U/XMLTV/stream paths so Plex (host network, must use `http://127.0.0.1:8023`) and IPTV clients reach it while the UI stays behind Umbrel login; amd64 only — arm64 is a separate `-arm64` tag)
- `mathieu-mcp-memory` — MCP Memory (doobidoo/mcp-memory-service `-slim` image: persistent semantic memory for AI agents, dashboard + `/mcp` on 8000, host port 6363; runs as `user: 1000:1000` with `HOME=/data` so the ~80 MB ONNX embedding model downloaded on first start lands in `data/memory/.cache`; SQLite at `data/memory/db`, daily backups; `MCP_API_KEY: ${APP_PASSWORD}` + `deterministicPassword`, the dashboard asks for that key too; nginx `web` sidecar maps `?token=` → `Authorization: Bearer` for Home Assistant; app_proxy `PROXY_AUTH_WHITELIST` opens `/mcp*` + `/api/health`; mDNS off)
- `mathieu-adguard-mcp` — AdGuard MCP (Samik081/mcp-adguard-home, 65 tools, MCP on container 3000 at `/`, host port 6464; reaches the official host-network `adguard-home` at `http://host.docker.internal:8095` via `host-gateway`; AdGuard passwords are bcrypt-hashed so the user enters their AdGuard admin login in the app settings (`environment:` ADGUARD_USERNAME/PASSWORD/ACCESS_TIER); upstream exits when it can't connect, so `server` wraps it in an `until … sleep 30` loop instead of crash-looping; upstream HTTP has no auth, so the nginx `web` sidecar checks the token (`${APP_PASSWORD}`, `?token=` or bearer) itself, serves a status page and returns 503 JSON while not connected)
- `mathieu-umbrel-mcp-bridge` — Umbrel MCP Bridge (nginx only, no data; host port 6161, `PROXY_AUTH_ADD: false`; `/mcp?token=umbrelmcp_…` → `Authorization: Bearer` → umbreld `/mcp` via `host.docker.internal:host-gateway`, which lan-ingress routes to umbreld for any Host; for Home Assistant's header-less MCP client)
- `mathieu-notifiarr` — Notifiarr (client for notifiarr.com: Discord notifications, dashboard, TRaSH sync and service checks for the *arr stack/Plex, web UI on 5454; runs as `user: 1000:1000`, config written by upstream at `/config/notifiarr.conf`, `hostname: ${DEVICE_HOSTNAME}` since notifiarr.com lists clients by hostname; no `DN_UI_PASSWORD` on purpose: upstream shows only its API key page (no login) until a notifiarr.com key is set, then logs in with notifiarr.com credentials until a local password is set in its profile page, and an env password would override that one at every start; apps added by the user in its UI, no `DN_*` env (they override the config file); `host.docker.internal:host-gateway` so Plex can be added at `http://host.docker.internal:32400`; app_proxy whitelists `/plex` for Plex's webhook at `http://127.0.0.1:5454/plex?token=<API key>`)
- `mathieu-vitals` — Vitals (this store's own: live numbers + health of Radarr/Sonarr/Prowlarr/Bazarr/Seerr/Transmission/Maintainerr/Healarr/Cleanuparr/Tracearr as one JSON API for a private dashboard; host port 6565; its own image `ghcr.io/mathieuletyrant/vitals`, code in `packages/vitals/`; `/v1/summary` and `/v1/apps/<id>` need `Authorization: Bearer ${APP_PASSWORD}` (`deterministicPassword`), app_proxy whitelists `/v1/*` + `/health`, `/` is a status page behind the Umbrel login; every `<APP>_URL`/`<APP>_API_KEY` is an `environment:` setting the user fills in (no default, the note gives the Umbrel URL), an empty URL means `not-configured`; the `media` widget is served on its own port 3001, never proxied, because umbreld calls widgets without credentials)
- `mathieu-unpackerr` — Unpackerr (extracts .rar/.7z/.zip downloads so Radarr/Sonarr/Lidarr can import them; headless, nginx `web` status sidecar on host port 5657 reads Unpackerr's `/metrics` (container 5656, not published) and tails `data/config/unpackerr.log` (`UN_LOG_FILE_MODE: 0644` so nginx can read it); runs as `user: 1000:1000`, all config via `UN_*` env; `UN_<APP>_0_URL`/`_API_KEY` are `environment:` settings, compose keeps the Umbrel URLs as defaults; an empty key makes Unpackerr skip that app)

## Adding or updating an app

1. Create a folder `mathieu-<name>/` with `umbrel-app.yml` and `docker-compose.yml`.
2. Model the packaging on the official apps (https://github.com/getumbrel/umbrel-apps)
   and, for third-party images, on dennysubke/dennys-umbrel-app-store (a large,
   well-maintained community store with 200+ apps to copy conventions from).
3. Wire it into Renovate: a `# renovate: datasource=docker depName=<image>` line right
   above `version:` in `umbrel-app.yml`, and a
   `{ "matchPackageNames": ["<image>"], "commitMessageTopic": "<Name>" }` entry in
   `renovate.json` `packageRules` (alphabetical by topic). CI (`validate_apps.py`) fails
   when the annotation has no matching rule.
4. Add or update its flow in `.claude/skills/verify-app/flows/<app-id>.yml` and verify it
   end to end with the `verify-app` skill (see "Verifying on a test umbrelOS").
5. Run `python3 .github/scripts/validate_apps.py`, then commit and push. Only commit/push
   when the user asks.

### docker-compose.yml conventions

- Always front the app with an `app_proxy` service:
  ```yaml
  services:
    app_proxy:
      environment:
        APP_HOST: mathieu-<name>_<service>_1   # <app-id>_<service-name>_1
        APP_PORT: <the app's internal port>
    <service>:
      image: <image>@sha256:<digest>           # pin by digest for reproducibility
      restart: on-failure
  ```
- Persist app data under `${APP_DATA_DIR}/data/...`.
  Umbrel owns this path as uid/gid **1000**.
- Shared Umbrel storage is mounted as `${UMBREL_ROOT}/data/storage/downloads:/downloads`.
  Keep that path literally: umbrelOS rewrites it to `${UMBREL_ROOT}/home/Downloads`
  when it patches the compose at install, and older umbrelOS versions still expect
  the old path. Hardcoding `home/Downloads` breaks installs on umbrelOS 1.x — Docker
  creates a root-owned empty dir and the container gets permission denied.
  The *arr containers expose it internally as `/downloads` (root folders
  `/downloads/movies`, `/downloads/shows`); match that container path so file
  paths line up. Mount read-only when the app only needs to read.
- For images that use linuxserver-style `PUID`/`PGID`, set both to `1000` so the
  container's user matches Umbrel's data ownership.
- Set `TZ` to `Etc/UTC` (like the official apps), never a personal timezone.
- **Do not add `cap_drop`, `security_opt: no-new-privileges`, or similar hardening
  flags** unless you have verified the image tolerates them. Many images start as
  root and drop privileges via `gosu`/`su-exec` + `chown`, which needs
  CAP_SETUID/CAP_SETGID/CAP_CHOWN. Dropping caps makes such entrypoints fail and
  the container exits — then `app_proxy` logs `The address '<id>_<svc>_1' cannot
  be found`. Umbrel provides isolation itself; these flags are not expected.

### Headless apps (no web UI)

`app_proxy` **requires** a TCP port to proxy — an app with no listening port
never becomes reachable and the tile can't be opened. The official store's
pattern (see `flaresolverr`) is to add a tiny **status web sidecar** as the
`app_proxy` target and run the headless worker as a separate service: e.g. an
`nginx:alpine` `web` service serving a small static status page (written inline
via `command:`), with `app_proxy` pointing at it and the `server` worker running
alongside. Headless apps that need per-user config (API keys) expose it as
`environment:` settings in `umbrel-app.yml`, filled in from the app's settings in umbrelOS;
document this in the listing.
(This store previously shipped `mathieu-decluttarr` this way; it was removed.)

### Wiring to other apps: left to the user

No auto-wiring. Apps of this store never read another app's API key, token or files, never write
into another app's data, and never run scripts in compose that call APIs or write configs to
connect apps together (no `exports.sh` key grepping, no one-shot `autoconfig`/`init` services).
The user connects apps in each app's own UI, the way upstream intends. (The official
Radarr/Sonarr/Lidarr/Prowlarr wire themselves through `getumbrel/media-app-configurator`; that's
theirs, not ours.)

- In the listing's setup instructions, say where to connect each app and give the address of the
  Umbrel App Store app (`http://radarr_server_1:7878`) and where its API key is.
- An app with no UI for it (headless, env-only: Labelarr, Unpackerr, Vitals) exposes the
  settings as `environment:` in `umbrel-app.yml`. umbreld only injects the values the user
  saved (`default:` just pre-fills the form), so keep a working default in compose (a URL,
  `USE_RADARR: "false"`); a saved setting overrides it.
- A static seeded config file (Soularr's config.ini, cross-seed's config.js) may carry Umbrel
  hostnames as defaults, but never keys.

Cross-app networking works via `<other-app-id>_<service>_1` hostnames (e.g.
`radarr_server_1:7878`, `sonarr_server_1:8989`) — the official *arr apps rely on
this too.

### umbrel-app.yml conventions

- Every manifest declares `storage:` / `dataRoot: data` right after `id:`. This is
  the umbrelOS 2.0 opt-in that lets users move an app's data to external storage,
  and it makes umbrelOS create the `${APP_DATA_DIR}/data/...` bind-mount sources
  before start. That does not make them writable for an image that runs as 1000
  (Maintainerr, slskd, Posterizarr): ship a `data/<dir>/.gitkeep` so the folder
  exists, owned by 1000, from install.
- `folderAccess:` (optional) declares user-pickable folders in the umbrelOS 2.0 UI.
  Not needed for a plain `/downloads` mount — umbrelOS auto-generates a slot for any
  compose mount under Downloads. Add it only for extra folders or a custom note.
- `environment:` (optional) exposes env vars users can edit from the app settings UI.
- App updates only copy `docker-compose.yml`, `exports.sh`, `*.template`, `torrc`,
  `hooks` and `umbrel-app.yml` — any other shipped file (scripts, `data/…`) is
  only laid down at install and never refreshed or overwritten afterwards.
- When a change needs to reach existing installs, bump `version` with a `-patch.N`
  suffix (e.g. `0.26.0-patch.1`) — Renovate replaces the whole string on the next
  image bump. Any image change (a sidecar digest like `nginx:alpine`, a
  `latest@digest` refresh) needs one: CI fails a PR that changes an app's images
  and leaves its `version` as it was.

- `id` must equal the folder name and start with `mathieu-`.
- Pick a real `icon` URL and, ideally, `gallery` images.
- Gallery images live **in this repo** as `<app-id>/gallery-N.jpg`, **1440×900 JPG**,
  referenced by their `raw.githubusercontent.com/.../master/<app-id>/gallery-N.jpg`
  URL — never hotlink upstream (URLs move, Git LFS / hashed site assets break).
  Source them from upstream screenshots (README, docs site), or, when there are
  none, from the `verify-app` flow's screenshots of the set-up app. Resize to
  1440 wide, then crop the top 900 px or pad with the edge colour. Use
  `gallery: []` only when the app has no UI worth showing (headless, MCP-only).
- The `icon.png` **must have a solid (non-transparent) background** — a
  transparent icon shows the tile background through its corners on umbrelOS and
  looks broken. If the upstream logo has alpha, composite it onto a solid
  background (e.g. dark slate `#23262F`) before committing:
  ```sh
  python3 - <<'PY'
  from PIL import Image
  fg = Image.open("mathieu-<name>/icon.png").convert("RGBA")
  bg = Image.new("RGBA", fg.size, (35, 38, 47, 255))
  bg.alpha_composite(fg)
  bg.convert("RGB").save("mathieu-<name>/icon.png", "PNG")
  PY
  ```
- Declare `permissions` the app needs (e.g. `STORAGE_DOWNLOADS`). For hardware
  transcoding declare `GPU`: umbrelOS adds the DRI/NVIDIA devices and the
  render/video groups when the host has a GPU. Never map `/dev/dri` in `devices:`,
  umbrelOS 2.0 strips it and older versions fail to start without a GPU.
- `port` is the **host** port Umbrel binds for the app — it must be unique across
  installed apps, including the official store's (CI checks it), and not a system port. **Never use 80/443** (taken by umbrelOS →
  install fails with `failed to bind host port ... address already in use`). Pick
  a free high port; it's independent of the container's internal `APP_PORT`.

## Home screen widgets

umbrelOS shows up to 3 widgets on its home screen. An app declares them under `widgets:` in
`umbrel-app.yml` (`id`, `type`, `refresh`, `endpoint: "<service>:<port>/<path>"`, `example` for the
picker). umbreld resolves `<service>` to the container IP of `<app-id>_<service>_1` and fetches the
JSON directly from the host: no app_proxy, no Umbrel login, the container's internal port.

- The JSON must carry `refresh` as a string (`"2m"`): umbreld parses it with `ms()` and fails the
  widget without it, and it, not the manifest's, sets the polling interval. umbrelOS renders the
  manifest's `type` and uses the response's `link` (a path on the app's own URL).
- None of this store's apps answer in that format, so this store builds its own, in `packages/`
  (Bun workspaces, one `Dockerfile` with `PACKAGE` as build arg):
  - `core/`: shared code, imported as `@mathieu/core/<module>`: HTTP, formatting, env, and the
    umbrelOS widget protocol (`widget.ts`: widget types and the handler that serves them).
  - `widgets/` → `ghcr.io/mathieuletyrant/umbrel-widgets`: the server of the store's app widgets.
    An app adds a `widget` service with that image and `WIDGET_APP=<app>`; each app's widgets are
    `src/apps/<app>.ts`, registered in `src/apps/index.ts`.
  - `vitals/` → `ghcr.io/mathieuletyrant/vitals`: the Vitals API. Each app it reads is
    `src/sources/<app>.ts` (data, health issues, display facts), registered in
    `src/sources/index.ts`; its `media` widget combines several apps through the same protocol.
  - Tests live next to each package, in `<package>/test/`.
- A failing app answers with the widget's `fallback` over HTTP 200 (an HTTP error makes umbrelOS
  show an error), and calls to the app time out after 3 s (umbreld has no timeout).
- Read keys from `${APP_PASSWORD}` or a setting the user fills in. Never a key copied by hand into
  the compose, never another app's files.
- The `Packages` workflow runs `bun run typecheck` and `bun test` on every push, and publishes each
  image the first time its version from `packages/<package>/package.json` is pushed, from any
  branch. Published versions are never overwritten: bump the version to ship a change.
- Renovate ignores the store's own images (`ghcr.io/mathieuletyrant/**`): the PR that bumps a
  package's version also pins the new digest (the run summary prints it) in every app using that
  image, with a `-patch.N` bump. `validate_apps.py` fails an app whose own-image tag differs from
  its package's version (each `package.json` names its `image`).
- Verify with a `widget: <id>` flow step, then a `see` of what the widget renders on the home screen.

## Verifying an image tag before publishing (avoid "manifest unknown")

Docker image tags often differ from GitHub *release* tags (e.g. release
`v1.3.17` but image tag `1.3.17` with no `v`). Always confirm the exact tag and
grab its digest before committing:

```sh
REPO=mescon/healarr        # owner/name on ghcr.io
TAG=1.3.17
token=$(curl -s "https://ghcr.io/token?scope=repository:$REPO:pull" \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')
# list tags
curl -s -H "Authorization: Bearer $token" \
  "https://ghcr.io/v2/$REPO/tags/list" | tr ',' '\n'
# confirm tag + get the digest to pin
curl -sI -H "Authorization: Bearer $token" \
  -H "Accept: application/vnd.oci.image.index.v1+json" \
  "https://ghcr.io/v2/$REPO/manifests/$TAG" \
  | tr -d '\r' | awk -F': ' 'tolower($1)=="docker-content-digest"{print $2}'
```

A wrong tag surfaces on the Umbrel host as
`Error: (HTTP code 404) unexpected - manifest unknown` during install.

## Verifying on a test umbrelOS

The `verify-app` skill (`.claude/skills/verify-app/`) runs umbrelOS in Docker, publishes the
working tree as this store, installs an app, runs its first-run setup in Chromium and
writes a proof screenshot:

```sh
node .claude/skills/verify-app/scripts/verify.mjs run mathieu-<name>   # or --changed / --all
```

Each app has a committed flow in `.claude/skills/verify-app/flows/<app-id>.yml` (apps it
needs, log patterns, browser steps). Keep it in sync with the app: a new app gets a flow,
a change that alters the UI or setup updates it. `SKILL.md` documents the format and the
failure triage.

## Automated updates

Renovate (Mend GitHub App, `renovate.json`) opens one PR per image bump, with the
manifest `version:` bumped alongside. Nothing auto-merges: a Claude routine fires
on each `renovate/*` PR and runs the `verify-app-and-merge` skill (changelog →
`releaseNotes` → `verify-app` with the proof on the PR → fix and re-verify → merge
verified patch/minor bumps, one comment on the rest). Run it by hand with
`/verify-app-and-merge <pr>`. The routine's cloud environment is prepared by
`.claude/skills/verify-app/scripts/setup-cloud.sh` (its setup script) and checked by
`verify.mjs doctor`.

## Testing changes on Umbrel

The store polls for git updates periodically. To force a refresh immediately,
remove and re-add the community store in umbrelOS, then install the app. Useful
host-side debugging:

- `journalctl -u umbrel*` — install/repo-sync errors
- `docker logs mathieu-<name>_<service>_1` — the app container's own logs
- `app_proxy` "address cannot be found" == the service container crashed/exited
