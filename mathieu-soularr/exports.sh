soularr_installed="$("${UMBREL_ROOT}/scripts/app" ls-installed 2>/dev/null || true)"

APP_MATHIEU_SOULARR_LIDARR_API_KEY=""
if echo "${soularr_installed}" | grep --quiet --line-regexp lidarr; then
  APP_MATHIEU_SOULARR_LIDARR_API_KEY="$(grep -Po '<ApiKey>\K[^<]+' "${UMBREL_ROOT}/app-data/lidarr/data/config/config.xml" 2>/dev/null | head -n 1 || true)"
fi
export APP_MATHIEU_SOULARR_LIDARR_API_KEY

APP_MATHIEU_SOULARR_SLSKD_API_KEY=""
if echo "${soularr_installed}" | grep --quiet --line-regexp mathieu-slskd; then
  soularr_slskd_key_file="${UMBREL_ROOT}/app-data/mathieu-slskd/data/umbrel-api-key"
  if [[ ! -s "${soularr_slskd_key_file}" ]]; then
    (umask 077 && od -An -tx1 -N24 /dev/urandom | tr -d ' \n' > "${soularr_slskd_key_file}") 2>/dev/null || true
  fi
  APP_MATHIEU_SOULARR_SLSKD_API_KEY="$(cat "${soularr_slskd_key_file}" 2>/dev/null || true)"
  unset soularr_slskd_key_file
fi
export APP_MATHIEU_SOULARR_SLSKD_API_KEY

unset soularr_installed
