sublarr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

sublarr_api_key() {
  local app="${1}"
  echo "${sublarr_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${app}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_SUBLARR_SONARR_API_KEY="$(sublarr_api_key sonarr)"
export APP_MATHIEU_SUBLARR_RADARR_API_KEY="$(sublarr_api_key radarr)"

unset -f sublarr_api_key
unset sublarr_installed
