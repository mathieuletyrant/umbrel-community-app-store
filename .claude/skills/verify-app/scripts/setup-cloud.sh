#!/usr/bin/env bash
# Setup script of the Claude Code cloud environment that runs the verify-app-and-merge routine.
# Runs once per fresh VM (root, Ubuntu 24.04, repo checkout as cwd) and its result is cached as
# long as it finishes within ~5 min: keep it to installs, start nothing (processes don't persist;
# `verify.mjs` starts dockerd itself at every run).
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends ffmpeg python3-yaml >/dev/null

command -v dockerd >/dev/null || curl -fsSL https://get.docker.com | sh
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'JSON'
{"registry-mirrors": ["https://mirror.gcr.io"]}
JSON

npm install -g playwright@1.63.0 @buildinternet/uploads@0.56.7 >/dev/null
npx --yes playwright@1.63.0 install --with-deps chromium >/dev/null

node .claude/skills/verify-app/scripts/verify.mjs doctor || true
