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
| **Lingarr** | **Automated subtitle translation** for Radarr/Sonarr: translate subtitles into French (or any language) via LibreTranslate or a SaaS engine (DeepL, OpenAI…), written next to your media. |
| **Sublarr** | **All-in-one subtitle manager & LLM translator**: searches 20+ providers, syncs timing (ffsubsync/alass), translates, and includes a waveform editor. A modern alternative to Bazarr + Lingarr. |
| **Byparr** | **Cloudflare-bypass proxy** for Prowlarr / Jackett: a drop-in **FlareSolverr replacement** that drives a modern stealth browser, standing up better to today's Cloudflare / DDoS-Guard challenges. |
| **SuggestArr** | **Automatic "what to watch" recommendations**: reads your Plex / Jellyfin / Emby history, finds similar titles (TMDb or any OpenAI-compatible LLM), and auto-requests them through Jellyseerr / Overseerr. |
| **cross-seed** | **Automatic cross-seeding**: finds torrents on your other trackers matching what you already seed and injects them into Transmission — more ratio on every tracker, zero extra disk space (hardlinks). |
| **Sportarr** | **PVR for sports** (Sonarr/Radarr-style): monitors leagues and events across fighting, football, soccer, basketball, racing…, grabs releases from your indexers, then renames, organizes and imports into Plex / Jellyfin / Emby. |

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

## 🛠️ Contributing / structure

Each app lives in its own folder prefixed with the store id `mathieu-`:

```
umbrel-app-store.yml        # store id + name
mathieu-<app>/
  umbrel-app.yml            # listing metadata (name, icon, description, port…)
  docker-compose.yml        # the app's services, behind Umbrel's app_proxy
  NOTES.md                  # per-app setup notes / gotchas (optional)
```

See [`CLAUDE.md`](./CLAUDE.md) for the packaging conventions and gotchas used
across these apps.

## 📄 License

App packaging in this repo is provided as-is. Each application is the property of
its respective author under its own license.
