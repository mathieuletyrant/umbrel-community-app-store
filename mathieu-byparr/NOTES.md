# Byparr — setup notes

Byparr needs no configuration of its own. In **Prowlarr** (or Jackett) go to
Settings → Indexers → add a **FlareSolverr** proxy and point the Host at:

```
http://mathieu-byparr_server_1:8191
```

Add a matching tag to the indexers that need Cloudflare bypass.

- It runs a real headless browser (Camoufox / seleniumbase), so it uses more RAM
  than FlareSolverr — the compose sets `shm_size: 2gb`.
- It only answers API requests; opening its tile shows the FastAPI docs page,
  which is normal.
