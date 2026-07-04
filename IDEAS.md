# App ideas (backlog)

Media / *arr companion apps we could add to this store later. All checked against
the official Umbrel App Store — **none of these are in it** (so no duplicates with
Sonarr, Radarr, Lidarr, Readarr, Prowlarr, Bazarr, Jackett, Autobrr,
flaresolverr, Jellyseerr, Overseerr, Tautulli, Transmission, qBittorrent,
SABnzbd, Jellyfin/Plex/Emby, etc. which are already official).

Legend: 🖥️ = has a web UI (easy Umbrel fit) · 🎧 = headless (needs the nginx
status-sidecar pattern, see CLAUDE.md).

## Top picks (web UI)

| App | What it does | Notes |
| --- | --- | --- |
| ~~**Huntarr**~~ ⚠️ | Continuously searches for **missing / upgradeable** content across Sonarr/Radarr/Lidarr/… | **Avoid (2026):** GitHub repo pulled + alleged security issues (unauth writes, plaintext API keys). |
| ~~**Maintainerr**~~ ✅ | Rule-based **media cleanup** (watched / old / low-watch) via Plex + Overseerr/Jellyseerr | **Added** (`mathieu-maintainerr`). |
| **Cross-seed** 🖥️ | Automatic **cross-seeding** of your torrents across trackers | More ratio, no re-downloading what you already have. UI/API. |
| **Tdarr** 🖥️ | Distributed **transcoding** + library health checks | Standardize/shrink files (H265 etc.). Powerful but resource-heavy. |

> ✅ **Profilarr** — added to the store (`mathieu-profilarr`).

## Useful but headless (need sidecar pattern)

| App | What it does |
| --- | --- |
| **Recyclarr** 🎧 | Syncs **TRaSH-guides** quality profiles / custom formats into Sonarr/Radarr (the de-facto quality standard) |
| **Unpackerr** 🎧 | Auto-**extracts** archived downloads for the *arr apps |

> ❌ **Watchlistarr** — dropped: no longer actively maintained (last release v0.2.6).
> Use **Overseerr / Jellyseerr** (official store) instead — they have native
> **Plex Watchlist → Radarr/Sonarr** auto-request sync.

## French-content focused (found via GitHub search)

| App | What it does | Repo |
| --- | --- | --- |
| ~~**Lingarr**~~ ✅ | **Auto-translates subtitles into French** (local or SaaS engines) when only e.g. English subs exist. Integrates with Radarr/Sonarr. | **Added** (`mathieu-lingarr`). |
| **Muxarr** 🖥️ | **Strips unwanted audio/subtitle tracks** without re-encoding (keep FR + original) → saves space, cleaner files. | `KirovAir/muxarr` |

## Discovery / automation (found via GitHub search)

| App | What it does | Repo |
| --- | --- | --- |
| **SuggestArr** 🖥️ | Auto-recommends & requests movies/shows to Overseerr/Jellyseerr based on watch activity. | `giuseppe99barchetta/SuggestArr` |
| **Tunarr** 🖥️ | Build **live-TV channels** from your own library (modern ErsatzTV). | `chrisbenincasa/tunarr` |
| **Notifiarr** 🖥️ | Universal **notification hub** for the *arr stack → Discord/Telegram/etc. | `Notifiarr/notifiarr` |
| **FileFlows** 🖥️ | Media **processing/transcoding pipelines** (Tdarr alternative). | fileflows.com |

## More finds (awesome-arr, 2026) — verified active

| App | What it does | Repo |
| --- | --- | --- |
| **Pulsarr** 🖥️ ⭐ | Real-time **Plex watchlist → Sonarr/Radarr**, driven from the Plex app. Maintained replacement for the dropped Watchlistarr. | `jamcalli/Pulsarr` |
| **Trailarr** 🖥️ | Downloads & manages **trailers** for your Radarr/Sonarr library. | `nandyalu/trailarr` |
| **Prefetcharr** 🎧 | Makes Sonarr fetch the **next season** of a show you're watching (Jellyfin/Emby/Plex). | `p-hueber/prefetcharr` |
| **Episeerr** 🖥️ | Sends/deletes episodes **one at a time** as you watch → saves space. | `Vansmak/episeerr` |
| **Wrapperr** 🖥️ | **"Plex Wrapped"** yearly stats (via Tautulli). | `aunefyren/wrapperr` |
| **Reiverr** 🖥️ | Unified Jellyfin + *arr UI (Overseerr-ish). Popular (⭐2k) but dev slowed (last commit Feb 2026). | `aleksilassila/reiverr` |
| **Taggarr** 🖥️ | Dub analysis & tagging — filter shows by dub/VF. Niche. | `BassHous3/taggarr` |

## Fun / bonus

- **Doplarr** / **Requestrr** — **Discord** bots to request movies/series directly from Discord.

## Also considered (overlap with existing / niche)

- **Checkrr** — corrupt/mismatched media scanner (overlaps Healarr).
- **Janitorr** — disk-space-based media cleanup (overlaps Maintainerr).
- **Kometa** (Plex Meta Manager) — collections/metadata (headless, config-heavy).
- **Posterizarr** — poster management.
- **Gaps** — find missing movies in collections (Radarr).
- **Jellystat / Streamystats** — Jellyfin stats (overlaps Tracearr).

## Recommended next 3 (given a Transmission + *arr + cleanup setup)

1. **Huntarr** — fill the library
2. **Maintainerr** — rule-based library cleanup
3. **Recyclarr** or **Profilarr** — release quality
