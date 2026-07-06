# SuggestArr — setup notes

SuggestArr requests through **Jellyseerr / Overseerr** — install one of them
first. It does **not** push to Radarr/Sonarr directly.

First launch walks you through the config in the web UI (port 5000):

1. **Media server** — connect Plex, Jellyfin or Emby (reads recent watch history).
2. **TMDb** — paste a free TMDb API key (used to find similar titles).
3. **Seer** — connect Jellyseerr/Overseerr URL + API key; pick which users' watch
   history seeds recommendations.
4. **Schedule** — set the cron cadence for automatic runs.

## AI mode (optional)

The default mode is plain TMDb similarity (no LLM needed). The beta **AI mode**
and **AI Search** use any OpenAI-compatible endpoint — point it at **OpenRouter**
(the same base you already use for the Renovate review workflow), OpenAI, or a
local **Ollama**, and paste an API key. Each pick comes with an AI-written reason.

## Config location

Config is file-based (SQLite) under
`~/umbrel/app-data/mathieu-suggestarr/data/config`.
