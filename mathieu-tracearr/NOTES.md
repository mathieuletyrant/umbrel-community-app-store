# Tracearr — setup notes

Tracearr runs a bundled PostgreSQL (TimescaleDB) + Redis inside a single
"supervised" container. Budget **~3 GB of free RAM**; on low-memory devices the
database can get OOM-killed.

Add your Plex / Jellyfin / Emby servers from the web UI after first launch.
