---
name: verify-app-and-merge
description: Get a Renovate PR of this store merged. Read the upstream changelog, refresh the app's releaseNotes (and -patch.N version for untracked digest bumps), verify the app on a test umbrelOS with a proof uploaded to the PR, fix what fails (flow, packaging, sandbox) and re-verify, then merge once CI and the proof are green, or leave one comment saying what blocks. Use on "merge PR 240", "review the Renovate PRs", "verify-app-and-merge", "review-app-update", or when a Claude routine fires on a renovate/* PR.
---

# Verify an app update and merge it

Handles Renovate PRs (`renovate/*` branches, opened by `renovate[bot]`) on
mathieuletyrant/umbrel-community-app-store. Read `CLAUDE.md` first.

**The deliverable is a merged PR.** A comment is the fallback for what you really
cannot fix, not the normal ending. Never claim "sandbox limit" from a guess: `doctor`
(step 0) says what the machine can do.

## Which PRs

- PR number(s) given (args, or the PR event that triggered a routine): handle those.
  Stop without doing anything when a PR's branch doesn't start with `renovate/`, or,
  when triggered by a PR event, when its head commit is not authored by `renovate[bot]`
  (your own push re-triggering you).
- None given: every open `renovate/*` PR, including ones you already commented on
  (their blocker may be fixed by now).
- Never close a Renovate PR: Renovate then ignores that version for good.

## Step 0 — preflight (one minute, saves ten)

```sh
V=.claude/skills/verify-app/scripts/verify.mjs
node $V doctor                      # ✗ = blocking, ⚠ = degraded, with the fix command
node $V up                          # Bash run_in_background: boots umbrelOS while you read the changelog
```

- `doctor` ✗ on Docker: `up` starts dockerd itself when it is installed and you are
  root. Only when `doctor` still fails after `up` is it a sandbox problem: comment with
  the `doctor` output and stop (that's the one case nothing here can fix; the fix is
  the environment's setup script, `.claude/skills/verify-app/scripts/setup-cloud.sh`).
- `doctor` ⚠ on `UPLOADS_TOKEN` or `uploads`: the run can't put proofs on the PR, so
  it can't merge. Finish everything else (changelog, releaseNotes, verify), then comment.

## For each PR

1. **Read the PR.** `gh pr view <n> --json title,body,headRefName,files` and
   `gh pr diff <n>`. Note the app folder, the image, old → new version, the update
   type (patch / minor / major / digest-only). Check it out:
   `git fetch origin master <branch> && git checkout <branch>` (`--changed` diffs
   against `origin/master`). PRs that only touch `.github/workflows/` or
   `.claude/skills/` (action digests, verify-app's umbrelOS image): skip to step 6.
2. **Changelog.** Read the upstream notes for every version between old and new: the PR
   body first (Renovate embeds the releases), then the upstream repo (`repo:` /
   `website:` in `umbrel-app.yml`): GitHub releases, CHANGELOG, docs site, Docker Hub,
   web search when the repo has none. A release without a body: read the compare
   (`gh api repos/<owner>/<repo>/compare/<old>...<new> --jq '.commits[].commit.message'`).
   Note anything needing a change on our side: breaking changes, new required env vars,
   changed ports, data path or volume migrations, dropped architectures.
3. **Keep `umbrel-app.yml` in sync** (the file of every app the PR touches, committed to
   the PR branch; a sidecar digest bump such as `nginx:alpine` touches several apps at once):
   - `version:` is Renovate's job on a version bump: leave it. When the PR leaves
     `version:` unchanged (digest-only bump, or an image without a `# renovate:`
     annotation: sidecars like `nginx:alpine`, `node`, `:latest@digest`), bump it with
     `-patch.N` (`1.2.3` → `1.2.3-patch.1`, `-patch.1` → `-patch.2`), otherwise existing
     installs never get the image.
   - `releaseNotes:` for a real version bump: a short user-facing summary of what changed
     since the previous version (2–4 sentences, plain English, no marketing), a blank
     line, then `Full release notes can be found at <upstream release URL>`. YAML block
     scalar (`releaseNotes: >-`).
   - `-patch.N` bump (packaging change, nothing released upstream): one sentence on what
     changed for the user, no upstream link.
   - A change found in step 2 that you can make safely (new env var with a sane default,
     renamed path): make it in `docker-compose.yml` too.
   `python3 .github/scripts/validate_apps.py`, then commit as
   `Refresh releaseNotes for <App> <version>` (or a message naming the change) and push
   to the PR branch. Renovate stops rebasing the PR after your push; that's expected.
4. **Verify.** Once `up` has finished:
   `node $V run --changed --pr <n>` (Bash `run_in_background: true`, then carry on).
   When it ends, Read `summary.png`. Follow `.claude/skills/verify-app/SKILL.md`. An app
   with no flow still runs: install + containers + HTTP checks count, with a generic shot.
   The run's last line says `proofs on PR #n: k/k uploaded`; anything else means the
   proof isn't on the PR yet (`node $V attach --pr <n>` retries without re-running).
5. **Fix, don't report.** On a ❌, or when the changelog announces a breaking change,
   fix it on the PR branch and re-run step 4 (up to three runs in all):
   - step can't find its element, new wizard, changed login → flow drift: `explore`,
     then update `.claude/skills/verify-app/flows/<app-id>.yml`;
   - locale, timeout, blank shot, a sandbox-only quirk → fix `verify.mjs` or the flow
     (`egress: true`, `mock`), never by deleting an assertion;
   - renamed env var, new port, moved path, new required setting → adapt that app's
     `docker-compose.yml` / `umbrel-app.yml`, bump `-patch.N` if `version:` didn't move;
   - install or container error that reads like egress or a registry limit → check
     `doctor` again and `run.log`; confirm before calling it the sandbox.
   Commit each fix with a message naming it (the flow's `verified:` line too). Stop at
   a real upstream bug, a data migration needing manual steps, or a major bump.
6. **Merge** (`gh pr merge <n> --squash`) when all of these hold:
   - CI is green on the head you merge: `gh pr checks <n> --watch --fail-fast`;
   - verify is ✅ and you Read its proof (or the PR touches no app);
   - the proof is on the PR: read the `uploads-sh` comment back
     (`gh pr view <n> --json comments --jq '.comments[] | select(.author.login=="uploads-sh") | .body'`)
     and check its newest entry for the app is named `<app-id>--<new version>--pass--<hash>`
     (missing, `--fail--` or another version → no merge);
   - the bump is patch, minor or digest-only;
   - the changelog announces no data migration, breaking change or manual step.
   Otherwise leave the PR open with **one** comment: what changed upstream (3–5
   bullets), the verify result, what you tried, what needs a decision, starting with
   `⚠️ Review needed — <reason>` (major bump, migration, manual step) or
   `⛔ Do not merge — <reason>` (verify ❌ you couldn't fix, sandbox ✗ with the `doctor`
   output). On a re-run, edit your previous comment instead of adding one:
   `gh api -X PATCH repos/{owner}/{repo}/issues/comments/<id> -f body=...`
   (`gh pr view <n> --json comments` gives the id).
   Never merge a major bump.

## Rules

- Touch only the app under review, its flow, `verify.mjs` and `setup-cloud.sh`; never
  other apps or `renovate.json`.
- Never merge on a ✅ whose proof you have not looked at, or that is not uploaded on the PR.
- Never force-push, never rewrite Renovate's commits, never close a Renovate PR.
- End with one line per PR: `#<n> <App> <old>→<new>: merged | left open (<reason>)`.
