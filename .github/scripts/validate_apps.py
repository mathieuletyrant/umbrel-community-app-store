#!/usr/bin/env python3
"""Structural validation for this Umbrel community app store.

Checks each `<store-id>-*/` app folder against the store's conventions so a
broken definition can't reach master. Exits non-zero (and prints every problem)
on any failure.
"""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def load(path: Path):
    with path.open() as f:
        return yaml.safe_load(f)


store = load(ROOT / "umbrel-app-store.yml")
store_id = store["id"]
prefix = f"{store_id}-"

app_dirs = sorted(p for p in ROOT.iterdir() if p.is_dir() and p.name.startswith(prefix))
if not app_dirs:
    fail(f"no app folders found with prefix '{prefix}'")

seen_ports: dict[int, str] = {}

for d in app_dirs:
    name = d.name
    app_yml = d / "umbrel-app.yml"
    compose_yml = d / "docker-compose.yml"

    if not app_yml.exists():
        fail(f"{name}: missing umbrel-app.yml")
        continue
    if not compose_yml.exists():
        fail(f"{name}: missing docker-compose.yml")
        continue

    app = load(app_yml) or {}

    if app.get("id") != name:
        fail(f"{name}: umbrel-app.yml id '{app.get('id')}' must equal folder name '{name}'")
    if not str(app.get("id", "")).startswith(prefix):
        fail(f"{name}: id must start with '{prefix}'")

    port = app.get("port")
    if not isinstance(port, int):
        fail(f"{name}: port '{port}' must be an integer")
    else:
        if port in (80, 443):
            fail(f"{name}: port {port} is reserved by umbrelOS (never use 80/443)")
        if port in seen_ports:
            fail(f"{name}: port {port} already used by {seen_ports[port]}")
        else:
            seen_ports[port] = name

    compose = load(compose_yml) or {}
    services = compose.get("services", {})
    if "app_proxy" not in services:
        fail(f"{name}: docker-compose.yml has no app_proxy service")

    for svc, spec in services.items():
        if svc == "app_proxy":
            continue
        image = (spec or {}).get("image")
        if image and "@sha256:" not in image:
            fail(f"{name}: service '{svc}' image is not pinned by digest: {image}")

if errors:
    print(f"❌ {len(errors)} validation error(s):")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)

print(f"✅ {len(app_dirs)} apps valid (store id '{store_id}').")
