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
| **Agregarr** | **Keeps your Plex Home screen fresh**: builds collections from Trakt, IMDb, TMDb, Letterboxd, streaming Top 10s, Tautulli stats and Overseerr requests, pins them to Plex Home / Recommended on a schedule, and sends missing titles to Radarr / Sonarr. |
| **Posterizarr** | **Consistent posters & title cards** for Plex: fetches textless artwork (TMDb, Fanart.tv, TVDB), adds your overlays, borders and fonts, and uploads posters, season posters, backgrounds and episode cards — on a schedule or on each Sonarr / Radarr import. |
| **Labelarr** | **TMDb keywords → Plex labels**: tags every movie and show with its TMDb keywords ("heist", "time travel"…) for smart filters and collections. Finds Plex, Radarr and Sonarr on its own; only needs a free TMDb token. |
| **Lingarr** | **Automated subtitle translation** for Radarr/Sonarr: translate subtitles into French (or any language) via LibreTranslate or a SaaS engine (DeepL, OpenAI…), written next to your media. |
| **Sublarr** | **All-in-one subtitle manager & LLM translator**: searches 20+ providers, syncs timing (ffsubsync/alass), translates, and includes a waveform editor. A modern alternative to Bazarr + Lingarr. |
| **Byparr** | **Cloudflare-bypass proxy** for Prowlarr / Jackett: a drop-in **FlareSolverr replacement** that drives a modern stealth browser, standing up better to today's Cloudflare / DDoS-Guard challenges. |
| **SuggestArr** | **Automatic "what to watch" recommendations**: reads your Plex / Jellyfin / Emby history, finds similar titles (TMDb or any OpenAI-compatible LLM), and auto-requests them through Jellyseerr / Overseerr. |
| **cross-seed** | **Automatic cross-seeding**: finds torrents on your other trackers matching what you already seed and injects them into Transmission — more ratio on every tracker, zero extra disk space (hardlinks). |
| **Sportarr** | **PVR for sports** (Sonarr/Radarr-style): monitors leagues and events across fighting, football, soccer, basketball, racing…, grabs releases from your indexers, then renames, organizes and imports into Plex / Jellyfin / Emby. |
| **Trailarr** | **Automatic trailer downloader** for your Radarr/Sonarr library: fetches and stores trailers next to your movies and shows so Plex / Jellyfin / Emby play them in-app. |
| **slskd** | **Soulseek client** with a modern web UI: search and download from the Soulseek P2P network, set credentials in-browser, files land in your downloads share. |
| **Soularr** | **Bridges Lidarr → slskd → Lidarr**: reads Lidarr's *wanted* list, searches Soulseek via slskd, downloads the best match and imports it back — ideal for niche or rare tracks that never hit trackers. |
| **Tdarr** | **Automated transcoding & library health checks**: plugin-driven rules re-encode (H.265/AV1), remux, strip unwanted tracks and flag corrupt files across your library, using a Server + Node worker model. |
| **Muxarr** | **Strips unwanted audio & subtitle tracks** without re-encoding: keeps the languages you want (e.g. original + French) using Radarr/Sonarr's original-language info, renames tracks, and processes new imports automatically. Often saves 10–30% of disk space. |
| **Kapowarr** | **Comic book library manager** (*arr style): add volumes, and it searches, downloads, renames and converts issues — ComicVine metadata, built-in sources like GetComics, no separate indexer needed. |
| **Chaptarr** | **Ebook & audiobook manager** — a re-work of the retired Readarr that handles both in one instance: wanted list, indexers via Prowlarr, download client, organized import. |
| **Scryer** | **A whole *arr stack in one binary**: movies, series and anime in a single interface — monitoring, indexer search, quality upgrades, renaming, import and subtitles, in ~100 MB of RAM instead of a gigabyte. |
| **Weaver** | **Usenet downloader** (by the Scryer authors): download, PAR2 repair and extraction run as one streaming pipeline, with native RAR/7z/ZIP support and no external unrar or par2. |
| **Pulsarr** | **Plex watchlist → Sonarr / Radarr in real time**: watchlist a title in any Plex app and it starts downloading — for you and your friends, with routing rules, optional approvals and quotas, and delete sync. |
| **NeutArr** | **Hunts missing media and quality upgrades**: periodically asks Sonarr / Radarr / Lidarr / Readarr / Whisparr to search for missing or below-cutoff items, a few at a time. The maintained, security-hardened fork of Huntarr. |
| **Dispatcharr** | **IPTV & stream manager**: imports M3U playlists and XMLTV guides, cleans and organizes channels, then serves them to Plex / Jellyfin / Emby as an emulated HDHomeRun tuner (live TV + guide + DVR). |
| **Tunarr** | **Live TV channels from your own library**: builds always-on channels from Plex / Jellyfin / Emby or local folders, with time slots, shuffles and filler, served as an HDHomeRun tuner + M3U + XMLTV guide. |
| **Unpackerr** | **Extracts archived downloads** for the *arr stack: when a release arrives as .rar / .7z / .zip, it unpacks it so Radarr / Sonarr / Lidarr can import it, then cleans up the extracted copy. Finds your *arr apps and their API keys on its own. |
| **arr-mcp** | **One MCP server for the whole media stack**: lets Claude / ChatGPT (any MCP client) query and drive Radarr, Sonarr, Prowlarr, Bazarr, Jellyfin, Plex, Seerr, SABnzbd, Transmission, qBittorrent and Profilarr — with a `diagnose` tool that explains why something never showed up. Writes are opt-in and previewed. |
| **FreshRSS MCP** | **Your FreshRSS feeds as an MCP server**: lets Claude / ChatGPT (any MCP client) list your subscriptions, read unread articles as Markdown and mark them read — wired to the FreshRSS app automatically (API enabled, password generated), nothing to configure. |
| **AdGuard MCP** | **Your AdGuard Home as an MCP server**: ask an AI assistant why a site doesn't load, unblock a domain, block a service on one device, or add a DNS rewrite. Covers the whole AdGuard Home API. |
| **MCP Memory** | **Long-term memory for AI assistants**: an MCP server that remembers your preferences, decisions and setup across conversations, searched by meaning. Everything stays on your Umbrel, with daily backups. |
| **Umbrel MCP Bridge** | **Connect URL-only MCP clients** (like Home Assistant) to umbrelOS's own MCP server: moves a `?token=` from the URL into the `Authorization` header it requires. |

## 🚀 How to install

1. In umbrelOS, open the **App Store**.
2. Click the **⋮** menu (top right) → **Community App Stores**.
3. Add this repository's URL:

   ```
   https://github.com/mathieuletyrant/umbrel-community-app-store
   ```

4. Open the **Mathieu's Umbrel App Store** that now appears and install any app.

> ℹ️ Community app stores are third-party. Only add stores you trust — you're
> running their apps on your own hardware.

## 🔄 Updates

Apps follow their upstream releases automatically. [Renovate](https://github.com/renovatebot/renovate)
opens a pull request for every new image; each one is checked against the upstream
changelog, gets user-facing release notes, and is installed on a test umbrelOS
before it's merged. Updates then show up in umbrelOS like any other app update.

## 💬 Requests & issues

Want an app added, or something isn't working? [Open an issue](https://github.com/mathieuletyrant/umbrel-community-app-store/issues).

## 📄 License

App packaging in this repo is provided as-is. Each application is the property of
its respective author under its own license.
