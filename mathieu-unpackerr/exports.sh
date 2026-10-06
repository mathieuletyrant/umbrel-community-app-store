unpackerr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

unpackerr_api_key() {
  local app="${1}"
  echo "${unpackerr_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${app}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_UNPACKERR_RADARR_API_KEY="$(unpackerr_api_key radarr)"
export APP_MATHIEU_UNPACKERR_SONARR_API_KEY="$(unpackerr_api_key sonarr)"
export APP_MATHIEU_UNPACKERR_LIDARR_API_KEY="$(unpackerr_api_key lidarr)"

unset -f unpackerr_api_key
unset unpackerr_installed
