slskd_api_key_file="${UMBREL_ROOT}/app-data/mathieu-slskd/data/umbrel-api-key"
if [[ ! -s "${slskd_api_key_file}" ]]; then
  mkdir -p "${slskd_api_key_file%/*}" 2>/dev/null || true
  (umask 077 && od -An -tx1 -N24 /dev/urandom | tr -d ' \n' > "${slskd_api_key_file}") 2>/dev/null || true
fi
export APP_MATHIEU_SLSKD_API_KEY="$(cat "${slskd_api_key_file}" 2>/dev/null || true)"
unset slskd_api_key_file
