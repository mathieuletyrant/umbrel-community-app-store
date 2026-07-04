# Mathieu's Umbrel App Store

A personal [Umbrel Community App Store](https://github.com/getumbrel/umbrel-apps),
focused on **self-hosted media apps** — the kind of tools that round out a
*arr / Plex / Jellyfin setup but aren't (yet) in the official Umbrel App Store.

Everything here is packaged for [umbrelOS](https://umbrel.com) and kept simple:
one folder per app, images pinned by digest, sensible defaults out of the box.

## 📦 Apps

| App | What it does |
| --- | --- |
| **Healarr** | Scans your media library for **corrupt files** (ffprobe / MediaInfo / HandBrake), deletes them, and triggers a re-download via Sonarr / Radarr / Whisparr — then verifies the replacement is healthy. |
| **Boxarr** | Tracks the **weekly box office top 10** and syncs it with Radarr: check what's already in your library, auto-add trending movies with smart filters, manage quality profiles. |
| **Tracearr** | Real-time **monitoring for Plex, Jellyfin & Emby** (an open-source Tautulli / Jellystat alternative): stream tracking, session history with geolocation, and account-sharing detection — all from one dashboard. |
| **Cleanuparr** | **Download queue cleanup** for the *arr stack: removes stalled, failed and orphaned downloads (no hardlinks / unclaimed files), then re-triggers a search. Web UI, works with Transmission / qBittorrent / SABnzbd. |
| **Profilarr** | **Quality profiles & custom formats manager** for Radarr/Sonarr: import curated TRaSH-style databases, keep them in sync with Git-style versioning, and push to all your *arr instances. |
| **Maintainerr** | **Rule-based library cleanup** for Plex: collect media by rules (watched, old, unrequested…), show a "Leaving Soon" Plex collection, then auto-delete via Radarr/Sonarr after a grace period. |

## 🚀 How to install

1. In umbrelOS, open the **App Store**.
2. Click the **⋮** menu (top right) → **Community App Stores**.
3. Add this repository's URL:

   ```
   https://github.com/mathieuletyrant/umbrel-community-app-store
   ```

4. Open the **Mathieu App Store** that now appears and install any app.

> ℹ️ Community app stores are third-party. Only add stores you trust — you're
> running their apps on your own hardware.

## 🧩 Notes per app

- **Healarr** — mounts Umbrel's downloads storage read-only at `/media`. Point it
  at your *arr apps and choose which library paths to scan.
- **Boxarr** — configured entirely from its web UI. Install **Radarr** first and
  connect Boxarr to it.
- **Tracearr** — runs a bundled PostgreSQL (TimescaleDB) + Redis in a single
  container. Budget **~3 GB of free RAM**; on low-memory devices the database can
  get OOM-killed. Add your Plex / Jellyfin / Emby servers after first launch.

## 🛠️ Contributing / structure

Each app lives in its own folder prefixed with the store id `mathieu-`:

```
umbrel-app-store.yml        # store id + name
mathieu-<app>/
  umbrel-app.yml            # listing metadata (name, icon, description, port…)
  docker-compose.yml        # the app's services, behind Umbrel's app_proxy
```

See [`CLAUDE.md`](./CLAUDE.md) for the packaging conventions and gotchas used
across these apps.

## 📄 License

App packaging in this repo is provided as-is. Each application is the property of
its respective author under its own license.
