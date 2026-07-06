# Healarr — setup notes

Healarr mounts umbrelOS's shared downloads folder **read-only** at `/downloads`
(host `~/umbrel/home/Downloads`), matching the paths Sonarr/Radarr report for
files so its health checks line up with the *arr libraries.

After launching, point Healarr at your *arr apps (Sonarr / Radarr / Whisparr)
and choose which library paths to scan. When it finds a corrupt file it deletes
it and triggers a re-download, then re-verifies the replacement is healthy.
