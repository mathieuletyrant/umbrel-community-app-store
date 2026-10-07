labelarr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

labelarr_is_installed() {
  echo "${labelarr_installed}" | grep --quiet --line-regexp "${1}"
}

labelarr_api_key() {
  labelarr_is_installed "${1}" || return 0
  grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/${1}/data/config/config.xml" 2>/dev/null | head -n 1 || true
}

labelarr_plex_token() {
  labelarr_is_installed plex || return 0
  grep -Po 'PlexOnlineToken="\K[^"]+' "${UMBREL_ROOT}/app-data/plex/data/config/Library/Application Support/Plex Media Server/Preferences.xml" 2>/dev/null | head -n 1 || true
}

export APP_MATHIEU_LABELARR_RADARR_API_KEY="$(labelarr_api_key radarr)"
export APP_MATHIEU_LABELARR_SONARR_API_KEY="$(labelarr_api_key sonarr)"
export APP_MATHIEU_LABELARR_PLEX_TOKEN="$(labelarr_plex_token)"

export APP_MATHIEU_LABELARR_USE_RADARR="$([ -n "${APP_MATHIEU_LABELARR_RADARR_API_KEY}" ] && echo true || echo false)"
export APP_MATHIEU_LABELARR_USE_SONARR="$([ -n "${APP_MATHIEU_LABELARR_SONARR_API_KEY}" ] && echo true || echo false)"
export APP_MATHIEU_LABELARR_PLEX_SIGNED_IN="$([ -n "${APP_MATHIEU_LABELARR_PLEX_TOKEN}" ] && echo true || echo false)"

unset -f labelarr_is_installed labelarr_api_key labelarr_plex_token
unset labelarr_installed
