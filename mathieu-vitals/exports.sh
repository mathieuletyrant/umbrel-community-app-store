vitals_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

vitals_is_installed() {
  echo "${vitals_installed}" | grep --quiet --line-regexp "${1}"
}

vitals_read() {
  local app="${1}" file="${2}" pattern="${3}"
  vitals_is_installed "${app}" || return 0
  grep -Po "${pattern}" "${UMBREL_ROOT}/app-data/${app}/data/config/${file}" 2>/dev/null | head -n 1 || true
}

vitals_wire() {
  local name="${1}" url="${2}" key="${3}"
  [[ -n "${key}" ]] || url=""
  export "APP_MATHIEU_VITALS_${name}_URL=${url}" "APP_MATHIEU_VITALS_${name}_API_KEY=${key}"
}

vitals_wire_url() {
  local name="${1}" app="${2}" url="${3}"
  vitals_is_installed "${app}" || url=""
  export "APP_MATHIEU_VITALS_${name}_URL=${url}"
}

vitals_wire RADARR http://radarr_server_1:7878 "$(vitals_read radarr config.xml '<ApiKey>\K[^<]+')"
vitals_wire SONARR http://sonarr_server_1:8989 "$(vitals_read sonarr config.xml '<ApiKey>\K[^<]+')"
vitals_wire PROWLARR http://prowlarr_server_1:9696 "$(vitals_read prowlarr config.xml '<ApiKey>\K[^<]+')"

vitals_bazarr_key=""
if vitals_is_installed bazarr; then
  vitals_bazarr_key="$(awk '/^auth:/ {a=1; next} /^[^ #]/ {a=0} a && /^  apikey:/ {sub(/^  apikey:[ ]*/, ""); gsub(/["\047]/, ""); print; exit}' "${UMBREL_ROOT}/app-data/bazarr/data/config/config/config.yaml" 2>/dev/null || true)"
fi
vitals_wire BAZARR http://bazarr_server_1:6767 "${vitals_bazarr_key}"

vitals_seerr_key="$(vitals_read jellyseerr settings.json '"apiKey":\s*"\K[^"]+')"
if [[ -n "${vitals_seerr_key}" ]]; then
  vitals_wire SEERR http://jellyseerr_server_1:5055 "${vitals_seerr_key}"
else
  vitals_wire SEERR http://overseerr_server_1:5055 "$(vitals_read overseerr settings.json '"apiKey":\s*"\K[^"]+')"
fi

APP_MATHIEU_VITALS_TRANSMISSION_URL=""
if vitals_is_installed transmission \
  && [[ "$(jq -r '."rpc-authentication-required" // false' "${UMBREL_ROOT}/app-data/transmission/data/config/settings.json" 2>/dev/null || true)" == "false" ]]; then
  APP_MATHIEU_VITALS_TRANSMISSION_URL="http://transmission_server_1:9091/transmission/rpc"
fi
export APP_MATHIEU_VITALS_TRANSMISSION_URL

vitals_wire_url MAINTAINERR mathieu-maintainerr http://mathieu-maintainerr_server_1:6246
vitals_wire_url HEALARR mathieu-healarr http://mathieu-healarr_server_1:3090
vitals_wire_url CLEANUPARR mathieu-cleanuparr http://mathieu-cleanuparr_server_1:11011
vitals_wire_url TRACEARR mathieu-tracearr http://mathieu-tracearr_server_1:3000

unset -f vitals_is_installed vitals_read vitals_wire vitals_wire_url
unset vitals_installed vitals_bazarr_key vitals_seerr_key
