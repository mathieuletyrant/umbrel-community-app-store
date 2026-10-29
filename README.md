# Mathieu's Umbrel App Store

A personal [Umbrel Community App Store](https://github.com/getumbrel/umbrel-apps),
focused on **self-hosted media apps** — the kind of tools that round out a
*arr / Plex / Jellyfin setup but aren't (yet) in the official Umbrel App Store.

Everything here is packaged for [umbrelOS](https://umbrel.com) and kept simple:
one folder per app, images pinned by digest, sensible defaults out of the box.

> 🤖 **This store is maintained with AI.** Most of the packaging, updates and
> fixes are written by an AI coding agent ([Claude Code](https://claude.com/claude-code)),
> under rules I set. See [How this store is maintained](#-how-this-store-is-maintained).

## 📦 Apps

| App | What it does |
| --- | --- |
| **arrglue** | **Wires the *arr stack together**: discovers every app on the Umbrel, reads their keys, checks routes, paths/hardlinks and each configured link by asking the apps themselves, then creates or repairs the links through their APIs (plan / apply, Terraform-style). Also a registry other tools can ask for URLs and keys. |
| **Healarr** | Scans your media library for **corrupt files** (ffprobe / MediaInfo / HandBrake), deletes them, and triggers a re-download via Sonarr / Radarr / Whisparr — then verifies the replacement is healthy. |
| **Boxarr** | Tracks the **weekly box office top 10** and syncs it with Radarr: check what's already in your library, auto-add trending movies with smart filters, manage quality profiles. |
| **Tracearr** | Real-time **monitoring for Plex, Jellyfin & Emby** (an open-source Tautulli / Jellystat alternative): stream tracking, session history with geolocation, and account-sharing detection — all from one dashboard. |
| **Cleanuparr** | **Download queue cleanup** for the *arr stack: removes stalled, failed and orphaned downloads (no hardlinks / unclaimed files), then re-triggers a search. Web UI, works with Transmission / qBittorrent / SABnzbd. |
| **Profilarr** | **Quality profiles & custom formats manager** for Radarr/Sonarr: import curated TRaSH-style databases, keep them in sync with Git-style versioning, and push to all your *arr instances. |
| **Maintainerr** | **Rule-based library cleanup** for Plex: collect media by rules (watched, old, unrequested…), show a "Leaving Soon" Plex collection, then auto-delete via Radarr/Sonarr after a grace period. |
| **Reclaimerr** | **Rule-based library cleanup for Jellyfin, Plex & Emby**: rules find what can go (unwatched, old, big, duplicates…), users ask to protect or delete titles, admins approve, then it deletes or moves through Radarr / Sonarr on a schedule you turn on — with a "Leaving Soon" dashboard row and notifications. |
| **Shredarr** | **Delete it in Jellyfin or Plex, it's gone everywhere**: removes the item from Sonarr / Radarr and Seerr, keeps the torrent seeding until your seeding rule is met, then deletes it from Transmission / qBittorrent / Deluge — season-pack and cross-seed aware, with Undo and Redownload. |
| **Agregarr** | **Keeps your Plex Home screen fresh**: builds collections from Trakt, IMDb, TMDb, Letterboxd, streaming Top 10s, Tautulli stats and Overseerr requests, pins them to Plex Home / Recommended on a schedule, and sends missing titles to Radarr / Sonarr. |
| **Posterizarr** | **Consistent posters & title cards** for Plex: fetches textless artwork (TMDb, Fanart.tv, TVDB), adds your overlays, borders and fonts, and uploads posters, season posters, backgrounds and episode cards — on a schedule or on each Sonarr / Radarr import. |
| **Labelarr** | **TMDb keywords → Plex labels**: tags every movie and show with its TMDb keywords ("heist", "time travel"…) for smart filters and collections. Needs a free TMDb token and your Plex token; Radarr and Sonarr optional. |
| **Lingarr** | **Automated subtitle translation** for Radarr/Sonarr: translate subtitles into French (or any language) via LibreTranslate or a SaaS engine (DeepL, OpenAI…), written next to your media. |
| **Sublarr** | **All-in-one subtitle manager & LLM translator**: searches 20+ providers, syncs timing (ffsubsync/alass), translates, and includes a waveform editor. A modern alternative to Bazarr + Lingarr. |
| **Byparr** | **Cloudflare-bypass proxy** for Prowlarr / Jackett: a drop-in **FlareSolverr replacement** that drives a modern stealth browser, standing up better to today's Cloudflare / DDoS-Guard challenges. |
| **SuggestArr** | **Automatic "what to watch" recommendations**: reads your Plex / Jellyfin / Emby history, finds similar titles (TMDb or any OpenAI-compatible LLM), and auto-requests them through Jellyseerr / Overseerr. |
| **cross-seed** | **Automatic cross-seeding**: finds torrents on your other trackers matching what you already seed and injects them into Transmission — more ratio on every tracker, zero extra disk space (hardlinks). |
| **D3X** | **Companion tool of the V3X tracker**: cross-seeds what you already seed onto V3X (same files, nothing re-downloaded), publishes what V3X is missing (torrent, TMDB, MediaInfo, presentation; one release or a whole folder), matches your media library and tracks your hit and runs. |
| **Transmission VPN** | **Transmission behind your VPN**: every torrent connection goes through Gluetun (ProtonVPN, Mullvad, NordVPN, PIA… kill switch included), so peers never see your public IP. With ProtonVPN or PIA, the forwarded port becomes Transmission's peer port automatically, so seeding stays fast. |
| **qBittorrent VPN** | **qBittorrent behind your VPN**: same Gluetun tunnel and kill switch as Transmission VPN, with categories, tags and per-category seeding limits, plus the VueTorrent web UI. With ProtonVPN or PIA, the forwarded port becomes qBittorrent's peer port automatically, and the app restarts the VPN when the provider stops renewing it. Counts as the Transmission app Radarr, Sonarr and Prowlarr require, so Transmission can go. |
| **Gluetun** | **Your VPN as a proxy, for the apps you choose**: connects to your VPN (ProtonVPN, Mullvad, NordVPN, PIA… kill switch included) and shares it through a password-protected HTTP proxy. Point Prowlarr's Indexer Proxies (per indexer, with a tag) or any app's proxy setting at it; everything else keeps your own connection. |
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
| **Spotarr** | **Share a reel, get the movie**: share an Instagram reel, TikTok or YouTube Short from your iPhone, an LLM + TMDB identify the movie or show, and Spotarr requests it through Seerr. |
| **NeutArr** | **Hunts missing media and quality upgrades**: periodically asks Sonarr / Radarr / Lidarr / Readarr / Whisparr to search for missing or below-cutoff items, a few at a time. The maintained, security-hardened fork of Huntarr. |
| **Dispatcharr** | **IPTV & stream manager**: imports M3U playlists and XMLTV guides, cleans and organizes channels, then serves them to Plex / Jellyfin / Emby as an emulated HDHomeRun tuner (live TV + guide + DVR). |
| **Tunarr** | **Live TV channels from your own library**: builds always-on channels from Plex / Jellyfin / Emby or local folders, with time slots, shuffles and filler, served as an HDHomeRun tuner + M3U + XMLTV guide. |
| **Ryot** | **One tracker for everything you watch, read, play and lift**: movies, shows, anime, books, audiobooks, podcasts, comics, music and video games, plus workouts and measurements — with Plex / Jellyfin / Emby / Kodi plays logged automatically and imports from Trakt, Goodreads, Letterboxd and more. |
| **Scrob** | **Your own Trakt, synced with your media servers**: watch history, ratings and lists for movies and shows, with libraries and watched status pulled from Jellyfin / Plex / Emby and live scrobbling by webhook (manual "mark as watched" included), Next Up, an episode calendar, Radarr / Sonarr requests and imports from Trakt, Simkl or Yamtrack. Web app for the phone and a REST API. |
| **Sofa** | **Your own Trakt / Letterboxd**: tracks the movies and shows you watch, episode by episode, with Continue Watching, ratings, what airs this week and where to stream it. Plex / Jellyfin / Emby log watches, Sonarr / Radarr pull your watchlist, Trakt / Simkl / Letterboxd history imports. Accounts for the whole household and iPhone / Android apps. |
| **Seek** | **Phone-first tracker for shows, films and books**: swipe an episode to mark it watched, see what airs this week, find something new from what you've seen. One account per person in the household, each with a private Jellyfin webhook; talks to Sonarr / Radarr. |
| **Snug** | **A cozy tracker for the TV series you're watching**: where you are, what's next and what airs soon, next episode marked in one tap. Series move between Watchlist, Watching, Paused, Completed and Dropped on their own; Jellyfin's webhook logs what you watch. |
| **Notifiarr** | **Rich Discord notifications for the whole media stack**: grabs, imports, Plex playback, stuck downloads, health checks and system snapshots, routed per channel from notifiarr.com, plus TRaSH profile sync. |
| **Unpackerr** | **Extracts archived downloads** for the *arr stack: when a release arrives as .rar / .7z / .zip, it unpacks it so Radarr / Sonarr / Lidarr can import it, then cleans up the extracted copy. Headless: API keys set in its umbrelOS settings. |
| **Vitals** | **Your media stack's health as one JSON API**: whether each app is up and the warnings and errors it reports, from Radarr, Sonarr, Prowlarr, Bazarr, Seerr, Transmission, qBittorrent, Maintainerr, Healarr, Cleanuparr and Tracearr. Built for your own dashboard. |
| **arr-mcp** | **One MCP server for the whole media stack**: lets Claude / ChatGPT (any MCP client) query and drive Radarr, Sonarr, Prowlarr, Bazarr, Jellyfin, Plex, Seerr, SABnzbd, Transmission, qBittorrent and Profilarr — with a `diagnose` tool that explains why something never showed up. Writes are opt-in and previewed. |
| **FreshRSS MCP** | **Your FreshRSS feeds as an MCP server**: lets Claude / ChatGPT (any MCP client) list your subscriptions, read unread articles as Markdown and mark them read. |
| **AdGuard MCP** | **Your AdGuard Home as an MCP server**: ask an AI assistant why a site doesn't load, unblock a domain, block a service on one device, or add a DNS rewrite. Covers the whole AdGuard Home API. |
| **MetaMCP** | **One MCP gateway for all your MCP servers**: gathers STDIO and remote MCP servers behind one endpoint, groups them into namespaces, picks which tools each AI client sees, and protects it with an API key or OAuth — with an MCP inspector and audit logs. |
| **MCP Memory** | **Long-term memory for AI assistants**: an MCP server that remembers your preferences, decisions and setup across conversations, searched by meaning. Everything stays on your Umbrel, with daily backups. |
| **Umbrel MCP Bridge** | **Connect URL-only MCP clients** (like Home Assistant) to umbrelOS's own MCP server: moves a `?token=` from the URL into the `Authorization` header it requires. |
| **Crawl4AI** | **Lets an AI read any web page**: a headless-browser crawler that returns clean Markdown, HTML, screenshots or PDFs, with its own MCP server and REST API — pair it with SearXNG for web search. |
| **Open Notebook** | **Your own NotebookLM**: chat with your PDFs, web pages, YouTube videos and audio, get cited answers and notes, and turn a notebook into a multi-voice podcast — with the AI of your choice (OpenAI, Anthropic, Google, Ollama…). |
| **Hermes Agent** | **Nous Research's self-improving AI agent**, packaged from the official image: it writes its own skills, remembers you across sessions, runs scheduled tasks and talks to MCP servers. Hermes's own login means the same address works from a browser, Hermes Desktop and the Hermex iPhone app; its OpenAI-compatible API serves apps like Open WebUI. |

## 🔗 Connecting apps

The apps of this store don't wire themselves to your other apps: you connect them in each app's
settings. Apps on your Umbrel reach each other by these addresses (copy them from here):

| App | Address | API key |
|---|---|---|
| Radarr | `http://radarr_server_1:7878` | Settings → General |
| Sonarr | `http://sonarr_server_1:8989` | Settings → General |
| Lidarr | `http://lidarr_server_1:8686` | Settings → General |
| Readarr | `http://readarr_server_1:8787` | Settings → General |
| Prowlarr | `http://prowlarr_server_1:9696` | Settings → General |
| Bazarr | `http://bazarr_server_1:6767` | Settings → General → Security |
| Jellyseerr | `http://jellyseerr_server_1:5055` | Settings → General |
| Overseerr | `http://overseerr_server_1:5055` | Settings → General |
| SABnzbd | `http://sabnzbd_web_1:8080` | Config → General |
| Tautulli | `http://tautulli_web_1:8181` | Settings → Web Interface |
| Transmission | `http://transmission_server_1:9091` (RPC: `/transmission/rpc`) | none |
| Transmission VPN | `http://mathieu-transmission-vpn_gluetun_1:9091` (RPC: `/transmission/rpc`) | none |
| qBittorrent VPN | `http://mathieu-qbittorrent-vpn_gluetun_1:8080` | `admin` and the app's default password (umbrelOS) |
| Gluetun (HTTP proxy) | host `mathieu-gluetun_gluetun_1`, port `8888`, username `proxy` | its default password |
| Plex | `http://host.docker.internal:32400` | your Plex token |
| Jellyfin | `http://jellyfin_server_1:8096` | Dashboard → API Keys |
| Crawl4AI | `http://mathieu-crawl4ai_server_1:11235/mcp/sse` (MCP) | its default password (bearer token) |
| Hermes Agent | `http://mathieu-hermes_server_1:8642/v1` (OpenAI-compatible API) | its default password |
| SearXNG | `http://searxng-web:8080` | none |
| Ollama | `http://ollama_ollama_1:11434` | none |
| Healarr | `http://mathieu-healarr_server_1:3090` | its settings |
| Cleanuparr | `http://mathieu-cleanuparr_server_1:11011` | its account settings |
| Maintainerr | `http://mathieu-maintainerr_server_1:6246` | none |
| Tracearr | `http://mathieu-tracearr_server_1:3000` | its settings |
| slskd | `http://mathieu-slskd_server_1:5030` | its options (`web.authentication.api_keys`) |
| Byparr | `http://mathieu-byparr_server_1:8191` | none |
| Shredarr | `http://mathieu-shredarr_server_1:8089` (Jellyfin webhook) | none |
| Scrob | `http://mathieu-scrob_server_1:7330` | in the webhook URLs of its Connections |
| Sofa | `http://mathieu-sofa_server_1:3000` | in the URLs of its Settings → Integrations |
| Seek | `http://mathieu-seek_server_1:8100` (Jellyfin webhook) | in your personal Jellyfin webhook URL |
| Snug | `http://mathieu-snug_server_1:3000` (Jellyfin webhook) | in the webhook URL of its Settings → Jellyfin |
| Vitals | `http://mathieu-vitals_server_1:3000/v1/summary` | its default password (bearer token) |
| MetaMCP | `http://mathieu-metamcp_server_1:12008/metamcp/<endpoint>/mcp` (MCP) | an API key from its API Keys page |
| arr-mcp | `http://mathieu-arr-mcp_server_1:6060/mcp` (MCP) | the bearer token on its dashboard |
| MCP Memory | `http://mathieu-mcp-memory_web_1/mcp` (MCP) | its default password (bearer token) |
| AdGuard MCP | `http://mathieu-adguard-mcp_web_1/mcp` (MCP) | its default password (bearer token) |
| FreshRSS MCP | `http://mathieu-freshrss-mcp_web_1/mcp` (MCP) | its default password (bearer token) |
| Spotarr | `http://mathieu-spotarr_server_1:3000/mcp?token=<MCP token>` (MCP) | Settings → Access |
| umbrelOS | `http://host.docker.internal/mcp` (MCP, apps declaring `host.docker.internal`) | a `umbrelmcp_` token from Settings → MCP |

Plex runs on the host network: apps reach it through `host.docker.internal` (the store's apps that
need it declare it), and Plex reaches an app through `http://127.0.0.1:<the app's port>`.

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

## 🤖 How this store is maintained

This is a one-person side project, and most of the work is done by an AI coding
agent ([Claude Code](https://claude.com/claude-code)) rather than by hand:

- **Packaging:** new apps and fixes are written by the agent, following the
  rules in [`CLAUDE.md`](CLAUDE.md) and each app's official install docs.
- **Updates:** Renovate opens a pull request for each new image. The agent reads
  the upstream changelog, writes the release notes, installs the app on a test
  umbrelOS and posts a screenshot of it running on the pull request. Verified
  patch and minor updates are merged by the agent; the rest wait for me.
- **Checks:** CI validates every app (pinned images, unique ports, including
  against the official store) before anything is merged.

What this means for you: apps are tested on a real umbrelOS before release, but
not by a human on every hardware setup, and the agent can get things wrong. The
upstream developers don't maintain these packages, so report problems here first.
If something is off, [open an issue](https://github.com/mathieuletyrant/umbrel-community-app-store/issues)
and it will be looked at.

## 💬 Requests & issues

Want an app added, or something isn't working? [Open an issue](https://github.com/mathieuletyrant/umbrel-community-app-store/issues).

## 📄 License

App packaging in this repo is provided as-is. Each application is the property of
its respective author under its own license.
