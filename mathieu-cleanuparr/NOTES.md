# Cleanuparr — orphan torrent & file cleanup (setup notes)

How this install is configured to remove torrents/files that are no longer
needed, in a **hardlink** setup (Radarr/Sonarr import with hardlinks; media at
`~/umbrel/home/Downloads`, Transmission downloads under `/downloads/complete`).

## Goal

When a movie/series is deleted in Radarr/Sonarr, the leftover torrent should be
removed from Transmission automatically (torrent + data), to free disk space.

## How it works (all inside the Cleanuparr web UI, port 11011)

Cleanuparr's **Download Cleaner** does it in two passes:

1. **Unlinked Download Handling** — detects torrents whose files no longer have
   any hardlink to the library (i.e. deleted from the *arr) and moves them to the
   category **`cleanuparr-unlinked`**.
2. **Seeding Rules** — act on that category and remove the torrent (+ files).

### The two seeding rules (both target `cleanuparr-unlinked` only)

| Rule | Privacy Type | Max Ratio | Min Seed Time | Max Seed Time | Delete Source Files |
|------|--------------|-----------|---------------|---------------|---------------------|
| Delete public  | **Public**  | `0` | `0` | `-1` | ✅ |
| Delete private | **Private** | `2` | `0` (or tracker's H&R hours) | `-1` | ✅ |

Public orphans are removed immediately; private orphans seed until ratio 2 first.

## Gotchas learned the hard way

- Detection is **hardlink-based** — this only works because the *arr apps import
  via hardlinks (a symlink setup would NOT work here).
- **Privacy Type** on a seeding rule is a hard filter. Set to `Public` it will
  silently skip a torrent whose privacy Cleanuparr can't confirm. Use the correct
  privacy per rule (or `Both`). This was the main blocker during setup.
- **`Max Seed Time = 0` is treated as disabled**, not "remove immediately". To
  remove regardless of ratio, use `Max Ratio = 0` instead.
- The category field of the delete-now rule must contain **only**
  `cleanuparr-unlinked` — never the active categories (radarr/sonarr/complete),
  or actively-seeding torrents get nuked.
- The web UI log viewer only shows the last ~1000 lines. The full log is the file
  at `~/umbrel/app-data/mathieu-cleanuparr/data/config/logs/cleanuparr-*.txt`.
  Set Log Level = Debug to see per-torrent skip reasons.
- **Orphaned Files** feature is **disabled on purpose**: it is NOT hardlink-aware
  (it flags any file with no active torrent, including library-linked files that
  legitimately outlive their torrent), so it's the wrong tool for a hardlink
  setup. The seeding rules above cover the real need.
- **A torrent with ANY missing file is skipped entirely.** If a torrent's file
  (even a sidecar `.nfo`) has been deleted on disk, Cleanuparr logs
  `skip | file does not exist or insufficient permissions | <path>` and never
  moves the torrent to `cleanuparr-unlinked`. Restore processing by recreating
  the missing file(s) — extract the paths from the log and `touch` them (see the
  fix-all snippet below), then re-run the cleaner. This is exactly why the manual
  cleanup below must NEVER delete individual files of a torrent still known to
  Transmission.

## Manual cleanup of true orphans (files with no library hardlink)

The seeding rules only handle torrents. Files left in `complete/` with **no
torrent at all** (removed long ago, failed imports) accumulate as real garbage.
A file with **link count 1** has no hardlink into the library, so deleting it
**cannot break Radarr/Sonarr/Plex**.

> ⚠️ **DO NOT delete individual files (especially sidecars: `.nfo`, samples,
> screenshots, `.txt`) of a torrent that still exists in Transmission.** Deleting
> one file of a live torrent (a) leaves Transmission with a missing file and
> (b) makes Cleanuparr skip that torrent **forever** (`skip | file does not
> exist`), so it never gets moved to `cleanuparr-unlinked`. Note that release
> `.nfo`/samples are usually link-1 **even for movies still in the library**
> (Radarr doesn't hardlink them), so a blanket `-links 1 -delete` WILL hit live
> torrents. This exact mistake was made once — see the fix-all below.

Safe ways to reclaim space, in order of preference:

1. **Let the automated flow do it.** An orphaned torrent (no library hardlink)
   is moved to `cleanuparr-unlinked` and removed (torrent + data) by the seeding
   rules. Nothing to do by hand.
2. **Remove the torrent from Transmission directly** with "delete data" — clean,
   whole-torrent, no leftovers, no Cleanuparr confusion.
3. **Delete a whole release folder** only after confirming Transmission has no
   torrent for it. Never delete pieces inside a live torrent's folder.

```sh
# READ-ONLY audit: files with no library hardlink (link count 1), biggest first.
# NOT in your library — but some may still be seeding torrents. Verify against
# Transmission before deleting, and delete the WHOLE release folder, not files.
find ~/umbrel/home/Downloads/complete -type f -links 1 \
  -not -path '*/cleanuparr-unlinked/*' -printf '%10s  %p\n' | sort -rn

# Cross-check one release against Transmission (empty output = no torrent = safe):
CT=$(docker ps --format '{{.Names}}' | grep -i trans)
docker exec "$CT" transmission-remote -l | grep -i 'RELEASE.NAME'
```

### Fix-all: restore sidecars deleted from live torrents

If a blanket delete removed sidecars of torrents still in Transmission, Cleanuparr
skips them. Recreate every missing file it complains about (only where the release
folder still exists), then re-run the Download Cleaner:

```sh
LOG=$(ls -t ~/umbrel/app-data/mathieu-cleanuparr/data/config/logs/cleanuparr-*.txt | head -1)
grep -F 'file does not exist' "$LOG" | sed 's/.* | //' | sort -u | while read -r p; do
  host="/home/umbrel/umbrel/home/Downloads${p#/downloads}"
  [ -d "$(dirname "$host")" ] && touch "$host" && echo "restored : $host"
done
```

The recreated files are empty placeholders — harmless (Radarr/Plex ignore them),
and they get removed with the torrent when a seeding rule fires.
