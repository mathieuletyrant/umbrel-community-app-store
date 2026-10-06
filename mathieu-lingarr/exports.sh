lingarr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

lingarr_api_key() {
  local app="${1}"
  echo "${lingarr_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${app}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_LINGARR_RADARR_API_KEY="$(lingarr_api_key radarr)"
export APP_MATHIEU_LINGARR_SONARR_API_KEY="$(lingarr_api_key sonarr)"

APP_MATHIEU_LINGARR_RADARR_URL=""
[[ -n "${APP_MATHIEU_LINGARR_RADARR_API_KEY}" ]] && APP_MATHIEU_LINGARR_RADARR_URL="http://radarr_server_1:7878"
export APP_MATHIEU_LINGARR_RADARR_URL

APP_MATHIEU_LINGARR_SONARR_URL=""
[[ -n "${APP_MATHIEU_LINGARR_SONARR_API_KEY}" ]] && APP_MATHIEU_LINGARR_SONARR_URL="http://sonarr_server_1:8989"
export APP_MATHIEU_LINGARR_SONARR_URL

unset -f lingarr_api_key
unset lingarr_installed
