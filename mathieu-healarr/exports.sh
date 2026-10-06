healarr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

healarr_api_key() {
  local app="${1}"
  echo "${healarr_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${app}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_HEALARR_RADARR_API_KEY="$(healarr_api_key radarr)"
export APP_MATHIEU_HEALARR_SONARR_API_KEY="$(healarr_api_key sonarr)"

unset -f healarr_api_key
unset healarr_installed
