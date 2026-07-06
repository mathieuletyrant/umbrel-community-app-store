# cross-seed — setup notes

cross-seed is **headless**: the app tile opens a static status page (nginx
sidecar, see CLAUDE.md), the real work happens in the `daemon` service.

## First-run config

On first start the daemon writes a starter `config.js` (only if none exists) to:

```
~/umbrel/app-data/mathieu-cross-seed/data/config/config.js
```

It is pre-wired for this setup:

- `torrentClients` → the official Transmission app (`transmission_server_1:9091`)
- `useClientTorrents: true` → reads the torrent list via Transmission's RPC,
  no torrent-dir mount needed
- `linkDirs: ["/downloads/cross-seed"]` + `linkType: hardlink` → matches are
  hardlinked, zero extra disk space; Transmission sees the same
  `/downloads` mount so injected torrents seed immediately
- `rssCadence: 30 minutes` / `searchCadence: 1 day` → automatic RSS matching
  and a rolling full search of everything you seed

The only thing to add is the `torznab` array: one URL per tracker, copied from
**Prowlarr** (Indexers → pick the indexer → Torznab URL), using the container
hostname, e.g.:

```js
torznab: [
  "http://prowlarr_server_1:9696/1/api?apikey=YOUR_PROWLARR_API_KEY",
  "http://prowlarr_server_1:9696/2/api?apikey=YOUR_PROWLARR_API_KEY",
],
```

Then restart the app. The indexer number is Prowlarr's internal indexer id
(visible in the indexer's Torznab URL in Prowlarr's UI).

## Gotchas

- The daemon **exits immediately while `torznab` is empty** — that's the
  expected crash-loop until the config is filled in; the tile still opens
  because it points at the nginx sidecar.
- Matches are injected **paused + rechecking**; they start seeding on their own
  once the recheck passes.
- Other apps (e.g. autobrr) can reach the API at
  `http://mathieu-cross-seed_daemon_1:2468` (API key: run
  `docker exec mathieu-cross-seed_daemon_1 cross-seed api-key`).
- Logs: `docker logs -f mathieu-cross-seed_daemon_1` and
  `~/umbrel/app-data/mathieu-cross-seed/data/config/logs/`.
