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
| ~~**Huntarr**~~ ⛔ | Continuously searches for **missing / upgradeable** content across Sonarr/Radarr/Lidarr/… | **Dead — do NOT use (2026):** repo deleted (404); confirmed unauth auth-bypass leaking every connected *arr API key. Maintained successor **NeutArr** **added** (`mathieu-neutarr`). |
| ~~**Byparr**~~ ✅ | **Cloudflare-bypass proxy** (drop-in FlareSolverr replacement) for Prowlarr/Jackett | **Added** (`mathieu-byparr`). |
| ~~**Maintainerr**~~ ✅ | Rule-based **media cleanup** (watched / old / low-watch) via Plex + Overseerr/Jellyseerr | **Added** (`mathieu-maintainerr`). |
| ~~**Cross-seed**~~ ✅ | Automatic **cross-seeding** of your torrents across trackers | **Added** (`mathieu-cross-seed`). Headless (API only, no UI) → status-sidecar pattern. |
| ~~**Tdarr**~~ ✅ | Distributed **transcoding** + library health checks | **Added** (`mathieu-tdarr`). |

> ✅ **Profilarr** — added to the store (`mathieu-profilarr`).

## Useful but headless (need sidecar pattern)

| App | What it does |
| --- | --- |
| **Recyclarr** 🎧 | Syncs **TRaSH-guides** quality profiles / custom formats into Sonarr/Radarr (the de-facto quality standard) |
| ~~**Unpackerr**~~ ✅ | Auto-**extracts** archived downloads for the *arr apps. **Added** (`mathieu-unpackerr`). |

> ❌ **Watchlistarr** — dropped: no longer actively maintained (last release v0.2.6).
> Use **Overseerr / Jellyseerr** (official store) instead — they have native
> **Plex Watchlist → Radarr/Sonarr** auto-request sync.

## French-content focused (found via GitHub search)

| App | What it does | Repo |
| --- | --- | --- |
| ~~**Lingarr**~~ ✅ | **Auto-translates subtitles into French** (local or SaaS engines) when only e.g. English subs exist. Integrates with Radarr/Sonarr. | **Added** (`mathieu-lingarr`). |
| ~~**Muxarr**~~ ✅ | **Strips unwanted audio/subtitle tracks** without re-encoding (keep FR + original) → saves space, cleaner files. | **Added** (`mathieu-muxarr`). |

## Discovery / automation (found via GitHub search)

| App | What it does | Repo |
| --- | --- | --- |
| ~~**SuggestArr**~~ ✅ | Auto-recommends & requests movies/shows to Overseerr/Jellyseerr based on watch activity (TMDb or OpenAI-compatible LLM). | **Added** (`mathieu-suggestarr`). |
| ~~**Tunarr**~~ ✅ | Build **live-TV channels** from your own library (modern ErsatzTV). | **Added** (`mathieu-tunarr`). |
| ~~**Notifiarr**~~ ✅ | Universal **notification hub** for the *arr stack → Discord. | **Added** (`mathieu-notifiarr`). |
| **FileFlows** 🖥️ | Media **processing/transcoding pipelines** (Tdarr alternative). | fileflows.com |

## More finds (awesome-arr, 2026) — verified active

| App | What it does | Repo |
| --- | --- | --- |
| ~~**Pulsarr**~~ ✅ | Real-time **Plex watchlist → Sonarr/Radarr**. | **Added** (`mathieu-pulsarr`) — replaces Seerr's watchlist sync with something lighter. |
| ~~**Trailarr**~~ ✅ | Downloads & manages **trailers** for your Radarr/Sonarr library. | **Added** (`mathieu-trailarr`). |
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
- **Gaps** — find missing movies in collections (Radarr).
- **Jellystat / Streamystats** — Jellyfin stats (overlaps Tracearr).
