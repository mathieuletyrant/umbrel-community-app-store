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

## Manual one-off cleanup of true orphans (files with no library hardlink)

The seeding rules only handle torrents. Files left in `complete/` with **no
torrent at all** (removed long ago, failed imports) accumulate as real garbage.
A file with **link count 1** has no hardlink into the library, so deleting it
**cannot break Radarr/Sonarr/Plex**. Caveat: a link-1 file may still be an active
torrent — deleting it just stops that seed (fine for public, costs ratio on
private). Cross-check with `transmission-remote -l` if you care about private
ratios.

```sh
# List true orphans (no library hardlink), biggest first — excludes the
# cleanuparr-unlinked category, which the seeding rules already handle.
find ~/umbrel/home/Downloads/complete -type f -links 1 \
  -not -path '*/cleanuparr-unlinked/*' -printf '%10s  %p\n' | sort -rn

# Delete them
find ~/umbrel/home/Downloads/complete -type f -links 1 \
  -not -path '*/cleanuparr-unlinked/*' -delete

# Clean up now-empty directories
find ~/umbrel/home/Downloads/complete -type d -empty -delete

# Optional: only delete obvious release cruft (sidecars/samples), safe anytime
find ~/umbrel/home/Downloads/complete -type f \( -iname '*.nfo' -o -iname '*.txt' \
  -o -iname '*.jpg' -o -iname '*.png' -o -iname '*.exe' -o -iname '*sample*.mkv' \
  -o -iname 'RARBG*' -o -iname '.DS_Store' \) -links 1 -print   # -delete to apply
```
