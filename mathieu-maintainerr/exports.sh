# Maintainerr 2.0+ runs as a non-root user (node, uid/gid 1000) and must OWN its
# data directory (/opt/data). Docker creates a missing bind-mount source as root,
# which makes the container fail with "Could not create or access (files in) the
# data directory". Pre-create the dir on the host and ensure 1000:1000 owns it
# before the container starts.
#
# NOTE: exports.sh runs on the host with `set -u`, and only UMBREL_ROOT is
# available here (APP_DATA_DIR is NOT), so build the path from UMBREL_ROOT.
mkdir -p "${UMBREL_ROOT}/app-data/mathieu-maintainerr/data/opt-data"
chown -R 1000:1000 "${UMBREL_ROOT}/app-data/mathieu-maintainerr/data/opt-data" 2>/dev/null || true
