---
name: verify-app
description: Verify an app of this store end to end on a throwaway umbrelOS (Docker), install it from the working tree, run its first-run setup flow in a real browser, and produce a proof screenshot. Use after adding or changing an app (compose, manifest, image bump), before opening or merging a PR, when a Renovate bump needs checking, when asked to "verify", "test on Umbrel", "prove it works" or for a screenshot of an app running — and to create or repair an app's flow in flows/.
---

# Verify an app on a test umbrelOS

`scripts/verify.mjs` runs umbrelOS in Docker ([dockur/umbrel](https://github.com/dockur/umbrel), pinned
by digest), publishes **the working tree** (uncommitted changes included) as the `mathieu` community
store, installs the app the way a user would, runs the app's flow from `flows/<app-id>.yml` in
Chromium, and writes a proof image.

```sh
V=.claude/skills/verify-app/scripts/verify.mjs
node $V run mathieu-healarr            # one app (or several)
node $V run --changed                  # apps touched vs origin/master (app folder or its flow)
node $V run --all                      # the whole store
```

Flags: `--keep` (leave it installed to poke at it), `--remote` (GitHub default branch instead of
the working tree), `--umbrel 1.7.4` (another `dockurr/umbrel` tag, e.g. the 1.x line), `--out DIR`,
`--no-record`, `--pr <n>` (see below). `run` always reinstalls the app from scratch; `requires` apps are reused when
already installed.

Output (`.verify-out/`, gitignored, or `--out`): `<app>.proof.png` (verdict banner + the flow's
last screenshot + the store listing + the umbrelOS home), the individual screenshots, and
`summary.json`. **Always send `<app>.proof.png` to the user** (SendUserFile) — it is the proof.
Use the scratchpad as `--out` when the user should open the files.

On success the flow's `verified:` line is updated (version, umbrelOS, date). Commit it with the
change it verified.

### Proof on a pull request

`run ... --pr <n>` uploads each proof to [uploads.sh](https://uploads.sh) and its bot
(`uploads-sh[bot]`) keeps **one** comment on the PR up to date with every proof and its ✅/❌ line.
Running again replaces the images in place.

Don't replay a flow just for the PR: when the proofs were made before the PR existed, attach
them with `node $V attach --pr <n>` (the changed apps, or name them). Each `run` leaves a
`<app>.result.json` next to the proof; `attach` refuses a proof when the app folder or its flow
changed since (the `verified:` line aside), so a stale proof never lands on a PR. Use the same
`--out` as the run. Nothing is committed, and it works from a Claude Code
on the web session, whose GitHub proxy refuses every native way to attach an image. Don't post a
proof comment of your own on top of it.

Needs `UPLOADS_TOKEN` (set in the environment's settings, never pasted in a conversation;
`uploads whoami` checks it) and the CLI (`npm install -g @buildinternet/uploads@0.56.7` when
`uploads` is missing). The repo is linked to the uploads workspace
(`uploads github link --status --repo mathieuletyrant/umbrel-community-app-store`). If the run
prints `PR comment failed`, post the comment yourself with the Markdown line it prints:
`![alt](embedUrl)`, never the `<img>` tag of the upload's `markdown` field, which the GitHub MCP
tools HTML-escape into text. Then read the comment back (`pull_request_read` `get_comments`) to
check it still holds `![`.

Uploads are **public** whatever the repository's visibility. The proof only shows the throwaway
umbrelOS, but never upload a shot holding real credentials or a user's data. Without the token,
send the proof with SendUserFile and say in the PR that it wasn't uploaded.

Other commands: `up` / `down` (wipe everything) / `status` / `store` / `install <id>` /
`uninstall <id>` / `logs <id>` / `explore` / `step` (see "Writing or repairing a flow").

## What `run` checks, in order

1. `requires` apps installed and healthy (official store ids like `radarr`, or `mathieu-*`).
2. App installs through umbreld (`apps.install`) — catches manifest/compose errors, bad tags
   (`manifest unknown`), port clashes.
3. Every container running, `healthy` when it has a healthcheck, one-shot services exited 0.
   A crash or restart loop fails with the container logs.
4. `logs:` patterns appear.
5. The app port answers HTTP through umbrelOS's ingress (skipped with `headless: true`).
6. Store listing + home screenshots, then the flow `steps` in a browser logged into umbrelOS.

## Flow file format (`flows/<app-id>.yml`)

```yaml
verified: 1.3.17-patch.1 on umbrelOS 2.0.0 (2026-10-06)   # written by run, don't hand-edit
requires: [radarr]            # installed first, uninstalled after
timeout: 300                  # seconds, per wait (default 300)
egress: true                  # app needs internet at runtime (see Sandbox)
headless: true                # no HTTP check on / (status page apps still get steps)
vars:                         # shell commands run on the host after install, retried until non-empty
  RADARR_API_KEY: docker exec radarr_server_1 sed -n 's:.*<ApiKey>\(.*\)</ApiKey>.*:\1:p' /config/config.xml
fixtures: [movie, show]       # sample media dropped into /downloads after install (see below)
setup:                        # shell commands run on the host after install (retried until they succeed)
  - docker exec mathieu-x_server_1 touch /config/seed
logs:                         # service → regex that must appear in <app-id>_<service>_1 logs
  server: started successfully
steps:                        # run on http://localhost:<port>, in order
  - goto: /                                   # path or absolute URL
  - click: Fresh Start                        # string = visible text
  - click: {role: button, name: Continue}     # or {css}, {label}, {placeholder}, {text}; add exact: true
  - click: {css: "[role=dialog] li", text: Films}   # css + text = the css matches that contain text
  - fill: {label: Password, exact: true, value: secret}
  - select: {css: "#arr-type", value: radarr}
  - check: {label: I agree}
  - press: Enter
  - see: Connection successful!               # waits until visible (same locator forms)
  - see: {text: Test Pattern, reload: true}   # reload the page until it shows up (async scans, jobs)
  - url: /dashboard                           # regex on the current URL
  - wait: 2000
  - mock: {path: /api/updates/check, status: 200, body: {...}}   # stub an app API call in the browser
  - http: {path: /mcp, method: POST, headers: {...}, body: {...}, status: 200, contains: regex}
  - shot: dashboard                           # named screenshot; the last one is the proof's main image
```

An `http` response's `mcp-session-id` header is sent back on the flow's next `http` steps, so a
flow can `initialize` a stateful MCP server, then call its tools.

`${NAME}` in values expands `vars`; `${env.<service>.<VAR>}` reads a container's env (e.g. a
deterministic `APP_PASSWORD`).

`fixtures` gives media apps something to work on: a 2-minute 640x360 H.264/AAC test pattern
(generated once with the host's ffmpeg, cached in `~/.umbrel-verify/fixtures`), copied to
`/downloads/movies/Test Pattern (2026)/Test Pattern (2026).mkv` (`movie`) and
`/downloads/shows/Test Show/Season 01/Test Show - S01E01 - Pilot.mkv` (`show`), owned by 1000.

## Writing or repairing a flow

A flow should take the app from a fresh install to its **real, set-up main screen**: do the
first-run wizard / account creation, wire it to the other apps it is built for when that is
possible offline (Radarr/Sonarr/Lidarr/Transmission from the official store, via
`<app>_server_1` hostnames and API keys read with `vars`), and end on a `see` of something only
the set-up app shows, then a `shot`. Stop at the setup screen only when the next step needs an
external account (Plex token, Soulseek login, LLM key) — say so in a comment.

Loop: keep a browser open and add steps one at a time.

1. Read the app's first-run code (setup wizard page, its buttons and labels) before guessing
   locators. Then start a session in the background (Bash `run_in_background`):
   `node $V explore <app-id> --fresh --serve`. It replays the steps already in the flow and
   prints the page.
2. `node $V step '<yaml step or list>'` runs steps on that same page (~2 s, open dialogs and
   form state kept), then prints the URL, the open dialog, every input and button **with a
   locator to copy** (icon-only buttons get `{css: "[role=dialog] button >> nth=0"}`, disabled
   ones are marked), the text, and a screenshot. A failing step leaves the page as it was, so
   try another locator. Add `--append` once a step works to write it into the flow (before
   the final `shot`). `node $V step` alone reprints the page; `step --stop` ends the session.
3. `node $V run <app-id>` and **look at the proof image**. A `see` can match text elsewhere on
   the page (e.g. "Dashboard" in "from the Dashboard"), so pick assertions unique to the target
   screen.

`--fresh` brings the app back to its just-installed state (after `fixtures` and `setup`). The
first time it reinstalls and saves a checkpoint of the app's data (and its `requires` apps'
data). After that it restores the checkpoint in seconds, and it reinstalls again only when the
app folder or the flow's `requires`/`prepare`/`setup`/`vars`/`fixtures`/`egress` changed.
`--reinstall` forces a reinstall. Restoring restarts the containers, so a step must not rely on
something that only happens on the very first boot (e.g. Tunarr redirects `/` to its welcome
page only before its first restart, so the flow opens `/web/welcome` directly). `--steps N`
replays only the first N steps; `--no-replay` opens `/` (or the given path) as is. Without
`--serve`, `explore` prints the page once and exits.

Prefer roles/labels/ids over brittle CSS. Comment only what is non-obvious (a mock, a sandbox
workaround, why the flow stops early).

## Maintaining

- **New app** → add `flows/<app-id>.yml` in the same change and run it. Before opening the
  PR, check the rest of the new-app checklist in `CLAUDE.md` too, especially the Renovate
  wiring (`# renovate:` annotation + `renovate.json` `commitMessageTopic` rule), and run
  `python3 .github/scripts/validate_apps.py`.
- **App changed** (compose, env, ports, image bump) → `run` it. When the upstream UI changed,
  update the flow; when the app is broken, fix the app, not the flow.
- **Failure triage** — read the error (it includes the URL, page text, recent console/HTTP
  errors and container logs) and the `failed-step-N` screenshot:
  - install/container error → packaging bug: fix `docker-compose.yml` / `umbrel-app.yml`;
  - step can't find an element after an upstream bump → flow drift: re-`explore`, update steps;
  - external call failing only here → sandbox limit: `egress: true` or `mock`, with a comment.
  Never delete assertions just to get green.
- Renovate PRs: `git fetch origin <branch> && git checkout <branch> && node $V run --changed`.
- The default umbrelOS image (`UMBREL_IMAGE` in `verify.mjs`) is bumped by Renovate; when a
  bump lands, `run --all` to catch umbrelOS-side breakage.
- `run --all` now and then catches drift on apps nobody touched.

## Sandbox notes (Claude Code cloud)

- `dockerd` is started automatically when Docker isn't running (root). umbrelOS listens on
  :80, apps on their manifest `port` (override with `VERIFY_UMBREL_PORT` / `VERIFY_GIT_PORT`).
- Docker Hub pulls go through `mirror.gcr.io` (Google's pull-through cache), so the anonymous
  rate limit of the shared egress IP (`429 Too Many Requests`) doesn't stall installs. On a
  dockerd that was already running: write `{"registry-mirrors": ["https://mirror.gcr.io"]}` to
  `/etc/docker/daemon.json` and `kill -HUP` it (live reload, containers keep running).
- Outbound HTTPS goes through a TLS-intercepting proxy. umbreld gets its CA automatically.
  App containers don't: `egress: true` appends the CA to the container's system trust store
  and restarts it (works for Go/Python/OpenSSL; Node apps that ignore the system store still
  fail). Some hosts are denied by policy (e.g. `api.github.com` for other repos) — `mock`
  the app's own endpoint in the browser instead, never work around the policy.
- App ports are only reachable from a browser logged into umbrelOS (the runner does that); a
  bare `curl` gets a 302 to umbrelOS auth.
- `down` wipes the test umbrelOS (`~/.umbrel-verify`). It only touches containers it created
  and compose projects, but don't run it on a machine with a real umbrelOS on the same Docker.
