# CLAUDE.md

Guidance for working in this repository.

## What this is

A personal [Umbrel Community App Store](https://github.com/getumbrel/umbrel-apps).
Umbrel users add it by URL and install the apps it publishes.

- Store id: `mathieu` — display name: `Mathieu` (shown in umbrelOS as "Mathieu App Store")
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
- `mathieu-healarr` — Healarr (media library health monitoring)
- `mathieu-boxarr` — Boxarr (box office tracking, syncs with Radarr)
- `mathieu-tracearr` — Tracearr (Plex/Jellyfin/Emby monitoring; single-container "supervised" image with bundled TimescaleDB + Redis)
- `mathieu-cleanuparr` — Cleanuparr (download queue cleanup for the *arr stack, web UI on 11011)
- `mathieu-profilarr` — Profilarr (quality profiles/custom formats manager for Radarr/Sonarr, web UI on 6868; 2 services: server + optional parser)
- `mathieu-maintainerr` — Maintainerr (rule-based Plex library cleanup, web UI on 6246; data at /opt/data)
- `mathieu-lingarr` — Lingarr (subtitle translation for Radarr/Sonarr, web UI on 9876; embedded SQLite, media at /downloads)
- `mathieu-sublarr` — Sublarr (all-in-one subtitle manager + LLM translator, web UI on 5765; runs as root, drops via gosu; media at /downloads)
- `mathieu-cross-seed` — cross-seed (automatic cross-seeding across trackers; headless daemon + nginx status sidecar, API on 2468; config.js seeded on first run, user adds torznab URLs)
- `mathieu-trailarr` — Trailarr (auto-downloads trailers for Radarr/Sonarr library, web UI on 7889; login admin/trailarr; config at /config, media at /downloads)

## Adding or updating an app

1. Create a folder `mathieu-<name>/` with `umbrel-app.yml` and `docker-compose.yml`.
2. Model the packaging on the official apps (https://github.com/getumbrel/umbrel-apps)
   and, for third-party images, on dennysubke/dennys-umbrel-app-store (a large,
   well-maintained community store with 200+ apps to copy conventions from).
3. Commit and push. Only commit/push when the user asks.

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
- Shared Umbrel storage is at `${UMBREL_ROOT}/data/storage/...` by the official
  convention (e.g. `downloads`). **BUT on this owner's umbrelOS the media lives
  in `${UMBREL_ROOT}/home/Downloads`** (the Files-app shared folder) — that path
  is what the *arr apps actually use here, so media-touching apps in this store
  mount `${UMBREL_ROOT}/home/Downloads:/downloads`, NOT `data/storage/downloads`.
  The *arr containers expose it internally as `/downloads` (root folders
  `/downloads/movies`, `/downloads/shows`); match that container path so file
  paths line up. Mount read-only when the app only needs to read.
- For images that use linuxserver-style `PUID`/`PGID`, set both to `1000` so the
  container's user matches Umbrel's data ownership.
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

Cross-app networking works via `<other-app-id>_<service>_1` hostnames (e.g.
`radarr_server_1:7878`, `sonarr_server_1:8989`) — the official *arr apps rely on
this too.

### umbrel-app.yml conventions

- `id` must equal the folder name and start with `mathieu-`.
- Pick a real `icon` URL and, ideally, `gallery` images. If the upstream repo has
  no screenshots, use `gallery: []` rather than linking broken images.
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

## Testing changes on Umbrel

The store polls for git updates periodically. To force a refresh immediately,
remove and re-add the community store in umbrelOS, then install the app. Useful
host-side debugging:

- `journalctl -u umbrel*` — install/repo-sync errors
- `docker logs mathieu-<name>_<service>_1` — the app container's own logs
- `app_proxy` "address cannot be found" == the service container crashed/exited
