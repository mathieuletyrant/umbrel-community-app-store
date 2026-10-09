vitals_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

vitals_read() {
  local app="${1}" file="${2}" pattern="${3}"
  echo "${vitals_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po "${pattern}" "${UMBREL_ROOT}/app-data/${app}/data/config/${file}" 2>/dev/null | head -n 1 || true
}

vitals_wire() {
  local name="${1}" url="${2}" key="${3}"
  [[ -n "${key}" ]] || url=""
  export "APP_MATHIEU_VITALS_${name}_URL=${url}" "APP_MATHIEU_VITALS_${name}_API_KEY=${key}"
}

vitals_wire RADARR http://radarr_server_1:7878 "$(vitals_read radarr config.xml '<ApiKey>\K[^<]+')"
vitals_wire SONARR http://sonarr_server_1:8989 "$(vitals_read sonarr config.xml '<ApiKey>\K[^<]+')"

APP_MATHIEU_VITALS_TRANSMISSION_URL=""
if echo "${vitals_installed}" | grep --quiet --line-regexp transmission \
  && [[ "$(jq -r '."rpc-authentication-required" // false' "${UMBREL_ROOT}/app-data/transmission/data/config/settings.json" 2>/dev/null || true)" == "false" ]]; then
  APP_MATHIEU_VITALS_TRANSMISSION_URL="http://transmission_server_1:9091/transmission/rpc"
fi
export APP_MATHIEU_VITALS_TRANSMISSION_URL

unset -f vitals_read vitals_wire
unset vitals_installed
