pulsarr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

pulsarr_api_key() {
  local app="${1}"
  echo "${pulsarr_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${app}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_PULSARR_SONARR_API_KEY="$(pulsarr_api_key sonarr)"
export APP_MATHIEU_PULSARR_RADARR_API_KEY="$(pulsarr_api_key radarr)"

unset -f pulsarr_api_key
unset pulsarr_installed

APP_MATHIEU_PULSARR_SONARR_URL="http://localhost:8989"
if [[ -n "${APP_MATHIEU_PULSARR_SONARR_API_KEY}" ]]; then
  APP_MATHIEU_PULSARR_SONARR_URL="http://sonarr_server_1:8989"
else
  APP_MATHIEU_PULSARR_SONARR_API_KEY="placeholder"
fi
export APP_MATHIEU_PULSARR_SONARR_URL APP_MATHIEU_PULSARR_SONARR_API_KEY

APP_MATHIEU_PULSARR_RADARR_URL="http://localhost:7878"
if [[ -n "${APP_MATHIEU_PULSARR_RADARR_API_KEY}" ]]; then
  APP_MATHIEU_PULSARR_RADARR_URL="http://radarr_server_1:7878"
else
  APP_MATHIEU_PULSARR_RADARR_API_KEY="placeholder"
fi
export APP_MATHIEU_PULSARR_RADARR_URL APP_MATHIEU_PULSARR_RADARR_API_KEY
