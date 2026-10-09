#!/usr/bin/env python3
"""Structural validation for this Umbrel community app store.

Checks each `<store-id>-*/` app folder against the store's conventions so a
broken definition can't reach master. Exits non-zero (and prints every problem)
on any failure.
"""
import json
import os
import re
import subprocess
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


def published_ports(compose: dict) -> set[int]:
    ports = set()
    for spec in (compose.get("services") or {}).values():
        for entry in (spec or {}).get("ports") or []:
            host = str(entry.get("published", "") if isinstance(entry, dict) else entry).split("/")[0]
            parts = host.split(":")
            if len(parts) >= 2 and parts[-2].isdigit():
                ports.add(int(parts[-2]))
    return ports


def images(compose: dict) -> list[str]:
    return sorted(str((spec or {}).get("image")) for spec in (compose.get("services") or {}).values() if (spec or {}).get("image"))


def base_version(path: str):
    base_ref = os.environ.get("BASE_REF")
    if not base_ref:
        return None
    shown = subprocess.run(["git", "show", f"{base_ref}:{path}"], cwd=ROOT, capture_output=True, text=True)
    return yaml.safe_load(shown.stdout) if shown.returncode == 0 else None


official_ports: dict[int, str] = {}
official_dir = os.environ.get("OFFICIAL_APPS_DIR")
if official_dir:
    for manifest in sorted(Path(official_dir).glob("*/umbrel-app.yml")):
        official = load(manifest) or {}
        if isinstance(official.get("port"), int):
            official_ports.setdefault(official["port"], f"official app '{manifest.parent.name}'")
        compose_file = manifest.parent / "docker-compose.yml"
        if compose_file.exists():
            for port in published_ports(load(compose_file) or {}):
                official_ports.setdefault(port, f"official app '{manifest.parent.name}' (published port)")
    if not official_ports:
        fail(f"OFFICIAL_APPS_DIR={official_dir} holds no official app manifests")
else:
    print("⚠️  OFFICIAL_APPS_DIR not set: ports are not checked against the official Umbrel App Store")

# The store's own images: Renovate leaves them alone, so the PR that bumps a package also pins
# its new version in every app using it.
own_images = {
    package["image"]: (manifest.parent.name, str(package["version"]))
    for manifest in sorted((ROOT / "packages").glob("*/package.json"))
    for package in [json.loads(manifest.read_text())]
    if "image" in package
}

renovate = json.loads((ROOT / "renovate.json").read_text())
renovate_topics = {
    pkg
    for rule in renovate.get("packageRules", [])
    if "commitMessageTopic" in rule
    for pkg in rule.get("matchPackageNames", [])
}

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

    annotation = re.search(r"# renovate: .*depName=(\S+)", app_yml.read_text())
    if annotation and annotation.group(1) not in renovate_topics:
        fail(f"{name}: renovate.json has no commitMessageTopic packageRule for {annotation.group(1)}")

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
        if port in official_ports:
            fail(f"{name}: port {port} already used by {official_ports[port]}: both apps can't be installed together")

    if (app.get("storage") or {}).get("dataRoot") != "data":
        fail(f"{name}: umbrel-app.yml must declare storage: dataRoot: data")

    compose = load(compose_yml) or {}
    services = compose.get("services", {})
    if "app_proxy" not in services:
        fail(f"{name}: docker-compose.yml has no app_proxy service")
    else:
        app_host = str(((services["app_proxy"] or {}).get("environment") or {}).get("APP_HOST", ""))
        match = re.fullmatch(rf"{re.escape(name)}_(.+)_1", app_host)
        if not match or match.group(1) not in services:
            fail(f"{name}: app_proxy APP_HOST '{app_host}' must be {name}_<service>_1 for a service of the compose")

    base_app = base_version(f"{name}/umbrel-app.yml")
    base_compose = base_version(f"{name}/docker-compose.yml")
    if base_app and base_compose and images(base_compose) != images(compose) and str(base_app.get("version")) == str(app.get("version")):
        fail(f"{name}: an image changed but version is still {app.get('version')}: bump it with -patch.N, or existing installs never get the new image")

    for port in published_ports(compose):
        if port in official_ports:
            fail(f"{name}: published port {port} already used by {official_ports[port]}")

    if annotation:
        version = str(app.get("version", "")).split("-patch.")[0].lstrip("v")
        tags = [
            str((spec or {}).get("image", "")).split("@")[0].rsplit(":", 1)[-1]
            for spec in services.values()
            if str((spec or {}).get("image", "")).startswith(annotation.group(1) + ":")
        ]
        if not tags:
            fail(f"{name}: no service uses the image {annotation.group(1)} named by the renovate annotation")
        for tag in tags:
            bare = re.sub(r"^(supervised-|v)", "", tag)
            if bare != version and not bare.startswith(version + "-"):
                fail(f"{name}: image tag '{tag}' does not match version '{app.get('version')}'")

    for svc, spec in services.items():
        if svc == "app_proxy":
            continue
        image = (spec or {}).get("image")
        repository, _, tag = str(image or "").split("@")[0].rpartition(":")
        if repository in own_images and tag != own_images[repository][1]:
            package, version = own_images[repository]
            fail(f"{name}: service '{svc}' uses {repository}:{tag}, but packages/{package} is at {version}: pin the new version and digest, with a -patch.N bump")
        if image and "@sha256:" not in image:
            fail(f"{name}: service '{svc}' image is not pinned by digest: {image}")
        for device in (spec or {}).get("devices") or []:
            if str(device).startswith("/dev/dri"):
                fail(f"{name}: service '{svc}' maps {device}: umbrelOS 2.0 strips it, declare the GPU permission in umbrel-app.yml instead")
            else:
                fail(f"{name}: service '{svc}' maps {device}: the container can't start on a host without that device")

if errors:
    print(f"❌ {len(errors)} validation error(s):")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)

print(f"✅ {len(app_dirs)} apps valid (store id '{store_id}').")
