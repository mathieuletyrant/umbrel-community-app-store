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
```

Every app id **must** be prefixed with the store id `mathieu-`.
Example: `mathieu-healarr`. The folder name equals the app id.

Current apps:
- `mathieu-healarr` — Healarr (media library health monitoring; one-shot `autoconfig` service (node:alpine, script inline) posts Radarr/Sonarr + their /downloads root folders to the public `/api/setup/import` while no password and no instance exist — keys from `exports.sh`; IDs are 1..n because the table is empty)
- `mathieu-boxarr` — Boxarr (box office tracking, syncs with Radarr)
- `mathieu-tracearr` — Tracearr (Plex/Jellyfin/Emby monitoring; single-container "supervised" image with bundled TimescaleDB + Redis)
- `mathieu-cleanuparr` — Cleanuparr (download queue cleanup for the *arr stack, web UI on 11011)
- `mathieu-profilarr` — Profilarr (quality profiles/custom formats manager for Radarr/Sonarr, web UI on 6868; 2 services: server + optional parser)
- `mathieu-maintainerr` — Maintainerr (rule-based Plex library cleanup, web UI on 6246; data at /opt/data)
- `mathieu-agregarr` — Agregarr (Plex collections + Home/Recommended hubs from Trakt/IMDb/TMDb/Letterboxd/Tautulli/Overseerr, web UI on 7171; the maintained `bitr8/agregarr` fork, upstream `agregarr/agregarr` stalled in April 2026; Overseerr-based, Plex OAuth setup wizard, runs as root, config at /app/config; `host.docker.internal:host-gateway` so the host-network Plex can be added by hand; /downloads mounted for its "Coming Soon" placeholder folders)
- `mathieu-posterizarr` — Posterizarr (poster/title card maker for Plex, FastAPI web UI on 8000, host port 8007; `user: 1000:1000` with `data/{config,assets,assetsbackup,manualassets}/.gitkeep`; Plex at `http://host.docker.internal:32400` via host-gateway, set in its onboarding with Plex OAuth "Auto-Fetch Token"; Sonarr/Radarr webhook `http://mathieu-posterizarr_server_1:8000/api/webhook/arr?api_key=…`)
- `mathieu-labelarr` — Labelarr (TMDb keywords → Plex labels; headless Go daemon, nginx `web` status sidecar on host port 9095; `exports.sh` reads Plex's `PlexOnlineToken` from its Preferences.xml and the Radarr/Sonarr keys on the host → upstream's `PLEX_TOKEN`/`USE_RADARR`/`RADARR_*`/`SONARR_*` env, Plex reached at `host.docker.internal:32400`; the TMDb token is an `environment:` setting; upstream exits on any missing setting or failed connection, so `server` loops `until ./labelarr | tee /data/labelarr.log … sleep 60` and the status page reads that log; `WEBHOOK_ENABLED` on 9090 behind the sidecar, app_proxy whitelists `/webhook` for Plex (host network) at `http://127.0.0.1:9095/webhook`)
- `mathieu-lingarr` — Lingarr (subtitle translation for Radarr/Sonarr, web UI on 9876; embedded SQLite, media at /downloads; `exports.sh` → upstream's `RADARR_URL`/`RADARR_API_KEY`/`SONARR_*` env, applied by Lingarr at every start — the URL is only exported when the key was found, since an empty value is skipped and a URL alone would overwrite a hand-set remote one)
- `mathieu-sublarr` — Sublarr (all-in-one subtitle manager + LLM translator, web UI on 5765; runs as root, drops via gosu; media at /downloads)
- `mathieu-byparr` — Byparr (Cloudflare-bypass proxy, drop-in FlareSolverr replacement for Prowlarr/Jackett, API on 8191; no config, Prowlarr points at `http://mathieu-byparr_server_1:8191`; runs a headless browser so `shm_size: 2gb`; the tile shows the FastAPI docs page)
- `mathieu-suggestarr` — SuggestArr (recommendations from Plex/Jellyfin/Emby watch history, requested through Jellyseerr/Overseerr, web UI on 5000; TMDb or OpenAI-compatible LLM, setup wizard in-UI; config at /app/config/config_files)
- `mathieu-cross-seed` — cross-seed (automatic cross-seeding across trackers; headless daemon + nginx status sidecar, API on 2468; at each start the daemon entrypoint runs an inline node script that writes `/config/umbrel-autoconfig.json` (Prowlarr's enabled torrent indexers as torznab URLs + Sonarr/Radarr, keys from `exports.sh`; keeps the last list when Prowlarr is down); the config.js seeded on first run spreads that file, existing config.js files are never touched)
- `mathieu-trailarr` — Trailarr (auto-downloads trailers for Radarr/Sonarr library, web UI on 7889; login admin/trailarr; config at /config, media at /downloads)
- `mathieu-slskd` — slskd (Soulseek client, web UI on 5030; runs as `user: 1000:1000` so `data/app/.gitkeep` is shipped to pre-own `/app`; SLSKD_REMOTE_CONFIGURATION lets users set Soulseek creds in-UI; default web login slskd/slskd; downloads to /downloads/soulseek/complete; publishes P2P port 50300; `exports.sh` generates `data/umbrel-api-key` once (outside the /app mount) → `SLSKD_API_KEY`, the primary admin key Soularr uses)
- `mathieu-soularr` — Soularr (bridges Lidarr wanted list → slskd → Lidarr import, web UI on 8265; ships a seeded `data/config/config.ini` prewired to lidarr_server_1 + mathieu-slskd_server_1 with `api_key = ${LIDARR_API_KEY}` / `${SLSKD_API_KEY}` — Soularr expands env vars in config.ini; `exports.sh` reads the Lidarr key and slskd's `data/umbrel-api-key` (creating it if slskd's own exports hasn't yet); the entrypoint rewrites the old placeholders of pre-existing installs; needs slskd + Lidarr)
- `mathieu-sportarr` — Sportarr (sports PVR à la Sonarr/Radarr, host port 1867/web UI 1867; Docker Hub image pinned by multi-arch index digest, linuxserver-style PUID/PGID, config at /config, media at /downloads)
- `mathieu-tdarr` — Tdarr (automated transcoding + library health checks, host port 8267/web UI 8265, Server port 8266; internalNode=true so it transcodes standalone; config split across /app/server + /app/configs + /app/logs, transcode cache at /temp, media at /downloads; iGPU needs /dev/dri added on host)
- `mathieu-kapowarr` — Kapowarr (comic book library manager à la *arr, web UI on 5656; Docker Hub tag has `v` prefix; PUID/PGID 1000, db at /app/db, root folder /downloads/comics)
- `mathieu-chaptarr` — Chaptarr (ebook/audiobook manager, Readarr re-work, web UI on 8789 — not Readarr's 8787; no public GitHub repo yet, Docker Hub only; PUID/PGID 1000, config at /config, root folder /downloads/books)
- `mathieu-scryer` — Scryer (whole *arr stack in one Rust binary: movies/series/anime, web UI on 8080, host port 8380; runs as root + PUID/PGID, config at /config, libraries under /downloads for hardlinks)
- `mathieu-weaver` — Weaver (Usenet downloader by the Scryer authors; download+PAR2 repair+extraction in one pipeline, web UI on 9090, host port 9390; bootstrap login admin/weaver-admin (Weaver requires ≥ 8 chars) via WEAVER_BOOTSTRAP_LOGIN_* env, only read on first start)
- `mathieu-pulsarr` — Pulsarr (Plex watchlist → Sonarr/Radarr in real time, web UI on 3003; PUID/PGID 1000, data at /app/data; `baseUrl`/`port` env pre-set to `http://mathieu-pulsarr_server_1:3003` so *arr webhooks reach it — env overrides the UI value; `sonarrBaseUrl`/`sonarrApiKey`/`radarr*` env from `exports.sh` seed its default instances, which Pulsarr only creates while it has none — `exports.sh` falls back to upstream's localhost/`placeholder` defaults when the app isn't installed)
- `mathieu-dispatcharr` — Dispatcharr (IPTV M3U/EPG manager + HDHomeRun emulation, web UI on 9191; AIO image with bundled Postgres + Redis, data at /data; `PROXY_AUTH_ADD: false` because Plex (host network) and IPTV clients hit `/hdhr`, `/output/*`, `/proxy/*` and root-level Xtream paths through app_proxy, and Dispatcharr has its own login; the host-network Plex app can't reach the Umbrel's own LAN IP on app ports, so it must use `http://127.0.0.1:9191/hdhr`)
- `mathieu-arr-mcp` — arr-mcp (MCP server for the whole *arr/Plex/Jellyfin stack, web UI + `/mcp` on 6060; claim-on-first-visit login, services added in-UI; app_proxy `PROXY_AUTH_WHITELIST` opens `/mcp*` + `/.well-known/*` so MCP clients bypass Umbrel login with the bearer token; auto-wires installed Umbrel apps: `exports.sh` greps their API keys on the host (Prowlarr-official pattern, must survive `set -euo pipefail`) → env of a one-shot `autoconfig` service (node script inline in compose, no `$` in it) that adds missing services to config.yaml before `server` starts; `.umbrel-autoconfig.json` remembers what was added so removed services stay removed)
- `mathieu-freshrss-mcp` — FreshRSS MCP (MCP server for the official `freshrss` app, `/mcp` on host port 6262 → container 8080; zero config: one-shot `init` service reuses the official FreshRSS image (same digest) with `DATA_PATH=/config/www/freshrss/data` and the app's data mounted from `${UMBREL_ROOT}/app-data/freshrss/data` to enable the API and generate the API password once into `data/shared` (never regenerated); `deterministicPassword` → `${APP_PASSWORD}` is the bearer `API_KEY`, shown as default credentials; image is `latest@digest` (upstream has no version tags), so bump `version` with `-patch.N` to ship digest updates; amd64 only)
- `mathieu-muxarr` — Muxarr (strips unwanted audio/subtitle tracks by remuxing, no re-encode; web UI on 8183, host port 8184 — 8183 is the official `lunalytics`; PUID/PGID 1000, config at /config, media at /downloads; Blazor setup wizard sets the webhook URL to `http://mathieu-muxarr_server_1:8183`)
- `mathieu-neutarr` — NeutArr (maintained, hardened Huntarr fork: periodically triggers searches for missing/cutoff-unmet media in Sonarr/Radarr/Lidarr/Readarr/Whisparr, web UI on 9705; PUID/PGID 1000, config at /config; `NEUTARR_SETUP_TOKEN: ${APP_PASSWORD}` + `deterministicPassword` so the first-run setup token is the default password shown by umbrelOS instead of a token buried in the logs)
- `mathieu-tunarr` — Tunarr (live TV channels built from Plex/Jellyfin/Emby or local folders, web UI on 8000, host port 8020; runs as root, config at /config/tunarr, media at /downloads read-only; app_proxy `PROXY_AUTH_WHITELIST` opens only the HDHomeRun/M3U/XMLTV/stream paths so Plex (host network, must use `http://127.0.0.1:8020`) and IPTV clients reach it while the UI stays behind Umbrel login; amd64 only — arm64 is a separate `-arm64` tag)
- `mathieu-mcp-memory` — MCP Memory (doobidoo/mcp-memory-service `-slim` image: persistent semantic memory for AI agents, dashboard + `/mcp` on 8000, host port 6363; runs as `user: 1000:1000` with `HOME=/data` so the ~80 MB ONNX embedding model downloaded on first start lands in `data/memory/.cache`; SQLite at `data/memory/db`, daily backups; `MCP_API_KEY: ${APP_PASSWORD}` + `deterministicPassword`, the dashboard asks for that key too; nginx `web` sidecar maps `?token=` → `Authorization: Bearer` for Home Assistant; app_proxy `PROXY_AUTH_WHITELIST` opens `/mcp*` + `/api/health`; mDNS off)
- `mathieu-adguard-mcp` — AdGuard MCP (Samik081/mcp-adguard-home, 65 tools, MCP on container 3000 at `/`, host port 6464; reaches the official host-network `adguard-home` at `http://host.docker.internal:8095` via `host-gateway`; AdGuard passwords are bcrypt-hashed so the user enters their AdGuard admin login in the app settings (`environment:` ADGUARD_USERNAME/PASSWORD/ACCESS_TIER); upstream exits when it can't connect, so `server` wraps it in an `until … sleep 30` loop instead of crash-looping; upstream HTTP has no auth, so the nginx `web` sidecar checks the token (`${APP_PASSWORD}`, `?token=` or bearer) itself, serves a status page and returns 503 JSON while not connected)
- `mathieu-umbrel-mcp-bridge` — Umbrel MCP Bridge (nginx only, no data; host port 6161, `PROXY_AUTH_ADD: false`; `/mcp?token=umbrelmcp_…` → `Authorization: Bearer` → umbreld `/mcp` via `host.docker.internal:host-gateway`, which lan-ingress routes to umbreld for any Host; for Home Assistant's header-less MCP client)
- `mathieu-unpackerr` — Unpackerr (extracts .rar/.7z/.zip downloads so Radarr/Sonarr/Lidarr can import them; headless, nginx `web` status sidecar on host port 5657 reads Unpackerr's `/metrics` (container 5656, not published) and tails `data/config/unpackerr.log` (`UN_LOG_FILE_MODE: 0644` so nginx can read it); runs as `user: 1000:1000`, all config via `UN_*` env; `exports.sh` greps the *arr API keys on the host like arr-mcp — an empty key makes Unpackerr skip that app, so uninstalled apps are harmless; an app installed later needs an Unpackerr restart)

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
alongside. Headless apps that need per-user config (API keys) are configured by
editing env in the app's compose on the host
(`~/umbrel/app-data/<app-id>/docker-compose.yml`); document this in the listing.
(This store previously shipped `mathieu-decluttarr` this way; it was removed.)

### Auto-wiring to other installed apps

Don't make users copy URLs and API keys between apps. The official Radarr/Sonarr/Lidarr/Prowlarr
already wire themselves (Prowlarr apps, Transmission/qBittorrent/SABnzbd, root folders) through
`getumbrel/media-app-configurator`; Bazarr and every app of this store are on their own. Pattern:

- `exports.sh` greps the keys on the host (`<ApiKey>` in `app-data/<app>/data/config/config.xml`,
  only for apps in `"${UMBREL_ROOT}/scripts/app" ls-installed`) and exports
  `APP_MATHIEU_<APP>_<OTHER>_API_KEY`. It runs with `set -euo pipefail`: end every pipeline with
  `|| true`. umbrelOS only sources the app's own `exports.sh` and those of its `dependencies`,
  never other installed apps', so read the other app's files directly instead of relying on its
  exports.
- Only wire an app the way it supports natively: upstream env vars (Lingarr, Pulsarr, slskd) or a
  config file it reads (Soularr's `${VAR}` in config.ini). **No new custom scripts in compose
  files** (inline node/sh calling APIs or writing configs): they are untested code to maintain in
  YAML. When an app has no native way, leave it manual and document the steps in its listing.
  The scripts already shipped (arr-mcp, Healarr, cross-seed) stay; don't extend the pattern.
- Never overwrite what the user set: seed only while the app is unconfigured.
- An app installed later is picked up on the next restart; say so in the listing.

Cross-app networking works via `<other-app-id>_<service>_1` hostnames (e.g.
`radarr_server_1:7878`, `sonarr_server_1:8989`) — the official *arr apps rely on
this too.

### umbrel-app.yml conventions

- Every manifest declares `storage:` / `dataRoot: data` right after `id:`. This is
  the umbrelOS 2.0 opt-in that lets users move an app's data to external storage,
  and it makes umbrelOS create the `${APP_DATA_DIR}/data/...` bind-mount sources
  before start (without it, Docker creates them root-owned).
- `folderAccess:` (optional) declares user-pickable folders in the umbrelOS 2.0 UI.
  Not needed for a plain `/downloads` mount — umbrelOS auto-generates a slot for any
  compose mount under Downloads. Add it only for extra folders or a custom note.
- `environment:` (optional) exposes env vars users can edit from the app settings UI.
- App updates only copy `docker-compose.yml`, `exports.sh`, `*.template`, `torrc`,
  `hooks` and `umbrel-app.yml` — any other shipped file (scripts, `data/…`) is
  only laid down at install and never refreshed or overwritten afterwards.
- When a change needs to reach existing installs, bump `version` with a `-patch.N`
  suffix (e.g. `0.26.0-patch.1`) — Renovate replaces the whole string on the next
  image bump.

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
- Declare `permissions` the app needs (e.g. `STORAGE_DOWNLOADS`).
- `port` is the **host** port Umbrel binds for the app — it must be unique across
  installed apps and not a system port. **Never use 80/443** (taken by umbrelOS →
  install fails with `failed to bind host port ... address already in use`). Pick
  a free high port; it's independent of the container's internal `APP_PORT`.

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
