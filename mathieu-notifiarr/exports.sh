notifiarr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

notifiarr_read() {
  local app="${1}" file="${2}" pattern="${3}"
  echo "${notifiarr_installed}" | grep --quiet --line-regexp "${app}" || return 0
  grep -Po "${pattern}" "${UMBREL_ROOT}/app-data/${app}/data/config/${file}" 2>/dev/null | head -n 1 || true
}

notifiarr_wire() {
  local prefix="${1}" url="${2}" key="${3}"
  [[ -n "${key}" ]] || return 0
  export "${prefix}_URL=${url}" "${prefix}_API_KEY=${key}"
}

notifiarr_wire DN_RADARR_0 http://radarr_server_1:7878 "$(notifiarr_read radarr config.xml '<ApiKey>\K[^<]+')"
notifiarr_wire DN_SONARR_0 http://sonarr_server_1:8989 "$(notifiarr_read sonarr config.xml '<ApiKey>\K[^<]+')"
notifiarr_wire DN_LIDARR_0 http://lidarr_server_1:8686 "$(notifiarr_read lidarr config.xml '<ApiKey>\K[^<]+')"
notifiarr_wire DN_READARR_0 http://readarr_server_1:8787 "$(notifiarr_read readarr config.xml '<ApiKey>\K[^<]+')"
notifiarr_wire DN_PROWLARR_0 http://prowlarr_server_1:9696 "$(notifiarr_read prowlarr config.xml '<ApiKey>\K[^<]+')"
notifiarr_wire DN_SABNZBD_0 http://sabnzbd_web_1:8080 "$(notifiarr_read sabnzbd sabnzbd.ini '^api_key = \K\S+')"
notifiarr_wire DN_TAUTULLI http://tautulli_web_1:8181 "$(notifiarr_read tautulli config.ini '^api_key = \K\S+')"

notifiarr_plex_token="$(notifiarr_read plex 'Library/Application Support/Plex Media Server/Preferences.xml' 'PlexOnlineToken="\K[^"]+')"
if [[ -n "${notifiarr_plex_token}" ]]; then
  export DN_PLEX_URL="http://host.docker.internal:32400" DN_PLEX_TOKEN="${notifiarr_plex_token}"
fi

if echo "${notifiarr_installed}" | grep --quiet --line-regexp transmission \
  && [[ "$(jq -r '."rpc-authentication-required" // false' "${UMBREL_ROOT}/app-data/transmission/data/config/settings.json" 2>/dev/null || true)" == "false" ]]; then
  export DN_TRANSMISSION_0_URL="http://transmission_server_1:9091/transmission/rpc"
fi

unset -f notifiarr_read notifiarr_wire
unset notifiarr_installed notifiarr_plex_token
