# Auto-extract the API keys from Sonarr and Radarr (installed from the official
# Umbrel App Store), mirroring how the official Prowlarr app wires the *arr
# apps together. The keys live in each app's config.xml as <ApiKey>...</ApiKey>.
# If an app isn't installed yet, the value is empty and Decluttarr simply skips
# that connection.
export APP_DECLUTTARR_SONARR_API_KEY=$(grep -oP '(?<=<ApiKey>)[^<]+' "${UMBREL_ROOT}/app-data/sonarr/data/config/config.xml" 2>/dev/null || echo "")
export APP_DECLUTTARR_RADARR_API_KEY=$(grep -oP '(?<=<ApiKey>)[^<]+' "${UMBREL_ROOT}/app-data/radarr/data/config/config.xml" 2>/dev/null || echo "")
