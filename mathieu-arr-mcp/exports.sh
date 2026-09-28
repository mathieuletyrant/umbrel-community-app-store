arr_mcp_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

arr_mcp_read() {
  local app="${1}" file="${2}" pattern="${3}"
  echo "${arr_mcp_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po "${pattern}" "${UMBREL_ROOT}/app-data/${app}/data/config/${file}" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_ARR_MCP_RADARR_API_KEY="$(arr_mcp_read radarr config.xml '<ApiKey>\K[^<]+')"
export APP_MATHIEU_ARR_MCP_SONARR_API_KEY="$(arr_mcp_read sonarr config.xml '<ApiKey>\K[^<]+')"
export APP_MATHIEU_ARR_MCP_PROWLARR_API_KEY="$(arr_mcp_read prowlarr config.xml '<ApiKey>\K[^<]+')"
export APP_MATHIEU_ARR_MCP_SABNZBD_API_KEY="$(arr_mcp_read sabnzbd sabnzbd.ini '^api_key = \K\S+')"
export APP_MATHIEU_ARR_MCP_JELLYSEERR_API_KEY="$(arr_mcp_read jellyseerr settings.json '"apiKey":\s*"\K[^"]+')"
export APP_MATHIEU_ARR_MCP_OVERSEERR_API_KEY="$(arr_mcp_read overseerr settings.json '"apiKey":\s*"\K[^"]+')"
export APP_MATHIEU_ARR_MCP_PLEX_TOKEN="$(arr_mcp_read plex 'Library/Application Support/Plex Media Server/Preferences.xml' 'PlexOnlineToken="\K[^"]+')"

APP_MATHIEU_ARR_MCP_BAZARR_API_KEY=""
if echo "${arr_mcp_installed}" | grep --quiet --line-regexp bazarr; then
  APP_MATHIEU_ARR_MCP_BAZARR_API_KEY="$(awk '/^auth:/ {a=1; next} /^[^ #]/ {a=0} a && /^  apikey:/ {sub(/^  apikey:[ ]*/, ""); gsub(/["\047]/, ""); print; exit}' "${UMBREL_ROOT}/app-data/bazarr/data/config/config/config.yaml" 2>/dev/null || true)"
fi
export APP_MATHIEU_ARR_MCP_BAZARR_API_KEY

APP_MATHIEU_ARR_MCP_TRANSMISSION="false"
if echo "${arr_mcp_installed}" | grep --quiet --line-regexp transmission \
  && [[ "$(jq -r '."rpc-authentication-required" // false' "${UMBREL_ROOT}/app-data/transmission/data/config/settings.json" 2>/dev/null || true)" == "false" ]]; then
  APP_MATHIEU_ARR_MCP_TRANSMISSION="true"
fi
export APP_MATHIEU_ARR_MCP_TRANSMISSION

unset -f arr_mcp_read
unset arr_mcp_installed
