boxarr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

boxarr_api_key() {
  local app="${1}"
  echo "${boxarr_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${app}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_BOXARR_RADARR_API_KEY="$(boxarr_api_key radarr)"

unset -f boxarr_api_key
unset boxarr_installed
