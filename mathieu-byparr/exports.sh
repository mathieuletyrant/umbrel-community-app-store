byparr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

byparr_api_key() {
  local app="${1}"
  echo "${byparr_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${app}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_BYPARR_PROWLARR_API_KEY="$(byparr_api_key prowlarr)"

unset -f byparr_api_key
unset byparr_installed
