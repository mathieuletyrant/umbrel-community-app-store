# Maintainerr 2.0+ runs as a non-root user (node, uid/gid 1000) and must OWN its
# data directory (/opt/data). Docker creates a missing bind-mount source as root,
# which makes the container fail with "Could not create or access (files in) the
# data directory". Pre-create the dir on the host and ensure 1000:1000 owns it
# before the container starts.
mkdir -p "${APP_DATA_DIR}/data/opt-data"
chown -R 1000:1000 "${APP_DATA_DIR}/data/opt-data" 2>/dev/null || true
