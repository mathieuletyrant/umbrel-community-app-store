---
name: review-app-update
description: Review a Renovate PR of this store end to end, read the upstream changelog, refresh the app's releaseNotes (and -patch.N version for untracked digest bumps), run verify-app, then merge it or leave one comment. Use on "review PR 240", "review the Renovate PRs", "review-app-update", or when a Claude routine fires on a renovate/* PR.
---

# Review an app update

Handles Renovate PRs (`renovate/*` branches, opened by `renovate[bot]`) on
mathieuletyrant/umbrel-community-app-store. Read `CLAUDE.md` first.

## Which PRs

- PR number(s) given (args, or the PR event that triggered a routine): handle
  those. Stop without doing anything if a PR's branch doesn't start with
  `renovate/`, or, when triggered by a PR event, if its head commit is not
  authored by `renovate[bot]` (your own push re-triggering you).
- None given: handle every open `renovate/*` PR that has no comment from you yet.

## For each PR

1. `gh pr view <n> --json title,body,headRefName,files` and `gh pr diff <n>`.
   Find the app folder, the image, old → new version, and the update type
   (patch / minor / major / digest-only). PRs that only touch
   `.github/workflows/` or `.claude/skills/` (action digests, verify-app's
   umbrelOS image): skip to step 5.
2. **Changelog.** Read the upstream release notes for every version between old
   and new: the PR body first, then the upstream repo (`repo:` / `website:` in
   the app's `umbrel-app.yml`): GitHub releases, CHANGELOG, docs site, Docker
   Hub. Search the web when the repo has none. Note anything that needs a change
   on our side: breaking changes, new required env vars, changed ports, data
   path or volume migrations, dropped architectures.
3. **Keep `umbrel-app.yml` in sync** (only that app's file, commit to the PR
   branch):
   - `version:` is Renovate's job — leave it, unless the bump is digest-only on
     an image that has no `# renovate:` annotation in the manifest (sidecars like
     `nginx:alpine`, `node`, `:latest@digest` images): then bump the manifest
     `version:` with `-patch.N` (`1.2.3` → `1.2.3-patch.1`, `-patch.1` →
     `-patch.2`), otherwise existing installs never get the new image.
   - `releaseNotes:` for a real version bump: rewrite it as a short user-facing
     summary of what changed since the previous version (2–4 sentences, plain
     English, no marketing), then a blank line and
     `Full release notes can be found at <upstream release URL>`. Use a YAML
     block scalar (`releaseNotes: >-`). Digest-only bump: leave it.
   - When step 2 found a needed change you can make safely (new env var with a
     sane default, renamed path), make it in `docker-compose.yml` too.
   Commit as `Refresh releaseNotes for <App> <version>` (or a message naming
   the change) and push to the PR branch.
4. **Verify.** `node .claude/skills/verify-app/scripts/verify.mjs run --changed --pr <n>`
   (run it in the background, as the skill says), then Read `summary.png`.
   Follow `.claude/skills/verify-app/SKILL.md`. If the app has no flow, run it
   anyway: install + containers + HTTP checks still count.
5. **Decide.** The gate is the verify proof: an app that installs and reaches
   its set-up screen works. But `verify-app` always installs from scratch, so it
   can't see what breaks an *existing* install on upgrade: that is what the
   changelog is for.
   - Merge (`gh pr merge <n> --squash`) when all hold:
     - verify is ✅ and you Read its proof (or the PR touches no app);
     - the proof is uploaded: read the uploads.sh comment on the PR back and
       check it shows that app's image (not uploaded → no merge);
     - the bump is patch, minor or digest-only;
     - the changelog announces no data migration, breaking change or manual step.
   - Otherwise leave it open with **one** comment: what changed upstream (3–5
     bullets), the verify result, and what needs a decision, starting with
     `⚠️ Review needed — <reason>` (major bump, migration or manual step) or
     `⛔ Do not merge — <reason>` (verify ❌, breaking change you couldn't fix).
   - Never merge a major bump.

## Rules

- Never touch other apps, `renovate.json` or this skill.
- Never merge on a ✅ whose proof you have not looked at, or that is not uploaded on the PR.
- Never force-push, never rewrite Renovate's commits.
- A ❌ that comes from the sandbox (egress blocked, Docker Hub rate limit), not
  from the app: say so in the comment, don't merge.
- End with one line per PR: `#<n> <App> <old>→<new>: merged | left open (<reason>)`.
