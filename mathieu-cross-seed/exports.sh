cross_seed_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

cross_seed_api_key() {
  local app="${1}"
  echo "${cross_seed_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${app}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_CROSS_SEED_PROWLARR_API_KEY="$(cross_seed_api_key prowlarr)"
export APP_MATHIEU_CROSS_SEED_RADARR_API_KEY="$(cross_seed_api_key radarr)"
export APP_MATHIEU_CROSS_SEED_SONARR_API_KEY="$(cross_seed_api_key sonarr)"

unset -f cross_seed_api_key
unset cross_seed_installed
