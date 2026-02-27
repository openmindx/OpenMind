#!/usr/bin/env bash
# curlllama.sh
# Ollama LAN discovery + connectivity verifier + curl command map.
#
# IMPORTANT (fixes your errors):
# - This file MUST start with this shebang line.
# - This script is BASH. If invoked with sh, it re-execs itself with bash.
#
# What it does:
# - Optional LAN scan to find Ollama servers (HTTP probe to /api/v1)
# - Verifies a chosen target responds: /api/v1, /api/tags, /api/ps
# - Runs a test /api/chat using a default prompt (editable with 3-second timer)
# - Prints a complete curl command map for interacting with the server
# - Local-only: optional service/port checks + UFW hardening (only if target is local)
#
# LAN Reality:
# - You cannot stop/kill/disable Ollama on REMOTE LAN hosts without privileged access
#   on that host (SSH + sudo/root). This script will not attempt remote control.
#
# Run:
#   chmod +x llamacurl.sh
#   ./llamacurl.sh
#
# Env overrides:
#   DEFAULT_HOST=10.0.0.155
#   DEFAULT_PORT=18080
#   READ_TIMEOUT_SECS=3
#   CURL_TIMEOUT_SECS=3
#   DEFAULT_MODEL=
#   DEFAULT_PROMPT=
#   SCAN_PARALLEL=64
#   SCAN_CONNECT_TIMEOUT=1
#   SERVICE_NAME=ollama
#
set -euo pipefail

# Re-exec with bash if needed (prevents "syntax error near unexpected token" from /bin/sh)
if [[ -z "${BASH_VERSION:-}" ]]; then
  exec /usr/bin/env bash "$0" "$@"
fi

DEFAULT_HOST="${DEFAULT_HOST:-10.0.0.155}"
DEFAULT_PORT="${DEFAULT_PORT:-18080}"
READ_TIMEOUT_SECS="${READ_TIMEOUT_SECS:-3}"
CURL_TIMEOUT_SECS="${CURL_TIMEOUT_SECS:-3}"
SERVICE_NAME="${SERVICE_NAME:-ollama}"

SCAN_PARALLEL="${SCAN_PARALLEL:-64}"
SCAN_CONNECT_TIMEOUT="${SCAN_CONNECT_TIMEOUT:-1}"

DEFAULT_MODEL="${DEFAULT_MODEL:-}"
DEFAULT_PROMPT="${DEFAULT_PROMPT:-You are connected to an Ollama server. Reply with: (1) a 1-line status, (2) the selected model name, (3) 3 short capabilities.}"

# -------------------- helpers --------------------
have() { command -v "$1" >/dev/null 2>&1; }

hr()   { printf '%s\n' "=== $* ==="; }
ok()   { printf '%s\n' "✓ $*"; }
warn() { printf '%s\n' "! warning: $*"; }
err()  { printf '%s\n' "! error: $*" >&2; }
info() { printf '%s\n' "$*"; }

read_with_timeout() {
  # read_with_timeout <varname> <prompt> <timeout_seconds>
  local __varname="$1"; shift
  local __prompt="$1"; shift
  local __timeout="$1"; shift
  local __val=""
  if read -r -t "${__timeout}" -p "${__prompt}" __val; then :; else __val=""; fi
  printf -v "${__varname}" '%s' "${__val}"
}

read_yesno_timeout() {
  # read_yesno_timeout <varname> <prompt> <timeout> <default Y/N>
  local __varname="$1"; shift
  local __prompt="$1"; shift
  local __timeout="$1"; shift
  local __default="$1"; shift
  local __val=""
  if read -r -t "${__timeout}" -p "${__prompt}" __val; then :; else __val=""; fi
  __val="${__val:-$__default}"
  case "${__val}" in
    y|Y|yes|YES) printf -v "${__varname}" '%s' "y" ;;
    *)           printf -v "${__varname}" '%s' "n" ;;
  esac
}

is_valid_port() {
  local p="$1"
  [[ "$p" =~ ^[0-9]+$ ]] || return 1
  (( p >= 1 && p <= 65535 )) || return 1
  return 0
}

strip_scheme() {
  local h="$1"
  h="${h#http://}"
  h="${h#https://}"
  echo "$h"
}

json_escape() {
  # requires python3
  python3 - <<'PY' "$1"
import json,sys
print(json.dumps(sys.argv[1]))
PY
}

pretty() { have jq && jq . || cat; }

curl_json() {
  # curl_json METHOD URL [BODY]
  local method="$1"; shift
  local url="$1"; shift
  local body="${1:-}"
  if [[ -n "${body}" ]]; then
    curl -sS --max-time "${CURL_TIMEOUT_SECS}" -X "${method}" \
      -H "Content-Type: application/json" \
      -d "${body}" \
      "${url}"
  else
    curl -sS --max-time "${CURL_TIMEOUT_SECS}" -X "${method}" "${url}"
  fi
}

curl_probe() {
  # Used for discovery: faster connect-timeout
  local url="$1"
  curl -sS --connect-timeout "${SCAN_CONNECT_TIMEOUT}" --max-time "${CURL_TIMEOUT_SECS}" "${url}"
}

get_local_ips() {
  if have hostname; then
    hostname -I 2>/dev/null | tr ' ' '\n' | sed '/^$/d' || true
  fi
}

is_local_host() {
  local host="$1"
  case "$host" in
    127.0.0.1|localhost|::1) return 0 ;;
  esac
  local ip
  while read -r ip; do
    [[ -n "$ip" && "$host" == "$ip" ]] && return 0
  done < <(get_local_ips)
  return 1
}

# -------------------- local-only diagnostics --------------------
check_lsof_port() {
  local port="$1"
  have lsof || { info "lsof not installed; skipping lsof check."; return 2; }
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

check_netstat_port() {
  local port="$1"
  if have netstat; then
    netstat -tulpn 2>/dev/null | grep -E "[:.]${port}\b" | grep -qi "LISTEN"
    return $?
  fi
  if have ss; then
    ss -ltnp 2>/dev/null | grep -E "[:.]${port}\b" >/dev/null 2>&1
    return $?
  fi
  info "netstat/ss not installed; skipping network socket check."
  return 2
}

systemd_is_active() {
  local svc="$1"
  have systemctl || return 2
  systemctl is-active --quiet "${svc}" 2>/dev/null
}

systemd_is_enabled() {
  local svc="$1"
  have systemctl || return 2
  systemctl is-enabled --quiet "${svc}" 2>/dev/null
}

# UFW (local-only)
is_root() { [[ "${EUID:-$(id -u)}" -eq 0 ]]; }

run_priv() {
  if is_root; then
    "$@"
  else
    have sudo || { err "sudo not found; cannot run privileged commands"; return 1; }
    sudo "$@"
  fi
}

ufw_installed() { have ufw; }
ufw_is_active() {
  ufw_installed || return 2
  local st
  st="$(run_priv ufw status 2>/dev/null | head -n 1 || true)"
  [[ "$st" =~ Status:\ active ]]
}

ufw_rule_exists_text() {
  local needle="$1"
  run_priv ufw status | grep -F "$needle" >/dev/null 2>&1
}

ufw_show_relevant_rules() {
  local port="$1"
  run_priv ufw status | grep -E "(^|[[:space:]])${port}(/tcp|/udp)?([[:space:]]|$)" || true
}

ufw_remove_existing_port_rules_prompt() {
  local port="$1"
  info "Existing rules for port ${port}:"
  ufw_show_relevant_rules "${port}"

  local ans=""
  read -r -p "Remove existing rules before continuing? (y/N) " ans
  ans="${ans:-N}"
  case "$ans" in
    y|Y|yes|YES)
      local numbered
      numbered="$(run_priv ufw status numbered | grep -E "(^|\])\s*${port}(/tcp|/udp)?([[:space:]]|$)" || true)"
      [[ -z "${numbered}" ]] && { info "No numbered rules matched for removal."; return 0; }

      mapfile -t nums < <(printf '%s\n' "${numbered}" | sed -n 's/^\[\s*\([0-9]\+\)\].*$/\1/p' | sort -rn)
      [[ "${#nums[@]}" -eq 0 ]] && { info "No rule numbers parsed for removal."; return 0; }

      for n in "${nums[@]}"; do run_priv ufw --force delete "${n}" >/dev/null || true; done
      ;;
    *) info "Keeping existing rules." ;;
  esac
}

ufw_lockdown_localhost_only() {
  local port="$1"
  info "Configuring UFW localhost-only for port ${port}..."

  local allow_in="${port}                      ALLOW IN    127.0.0.1"
  local deny_in="${port}                      DENY IN     Anywhere"
  local allow_out="127.0.0.1 ${port}            ALLOW OUT"
  local deny_out="${port}                      DENY OUT    Anywhere"

  if ufw_rule_exists_text "${allow_in}"; then info "Skipping adding existing rule"; else run_priv ufw allow in from 127.0.0.1 to any port "${port}" proto tcp >/dev/null; fi
  if ufw_rule_exists_text "${allow_out}"; then info "Skipping adding existing rule"; else run_priv ufw allow out to 127.0.0.1 port "${port}" proto tcp >/dev/null; fi
  if ufw_rule_exists_text "${deny_in}"; then info "Skipping adding existing rule"; else run_priv ufw deny in "${port}"/tcp >/dev/null; fi
  if ufw_rule_exists_text "${deny_out}"; then info "Skipping adding existing rule"; else run_priv ufw deny out "${port}"/tcp >/dev/null; fi

  ok "Localhost-only UFW rules applied (best-effort)"
}

# -------------------- LAN discovery --------------------
probe_host_port() {
  # prints: ip:port<TAB>version_json
  local ip="$1"
  local port="$2"
  local url="http://${ip}:${port}/api/v1"
  local out
  out="$(curl_probe "${url}" 2>/dev/null || true)"
  [[ -z "${out}" ]] && return 1
  [[ "${out}" != \{* ]] && return 1
  printf '%s\t%s\n' "${ip}:${port}" "${out}"
}

default_scan_prefix() {
  local first_ip
  first_ip="$(get_local_ips | head -n 1 || true)"
  if [[ -n "${first_ip}" && "${first_ip}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    echo "${first_ip%.*}"
  else
    echo "10.0.0"
  fi
}

extract_first_model() {
  if have jq; then
    jq -r '.models[0].name // empty'
  else
    grep -oE '"name"\s*:\s*"[^"]+"' | head -n 1 | sed -E 's/.*"name"\s*:\s*"([^"]+)".*/\1/' || true
  fi
}

print_found_summary() {
  local hp="$1"
  local base="http://${hp}"
  local tags
  tags="$(curl_probe "${base}/api/tags" 2>/dev/null || true)"
  if [[ -z "${tags}" ]]; then
    printf '  - %s (tags: unavailable)\n' "${hp}"
    return 0
  fi
  if have jq; then
    local count first
    count="$(printf '%s\n' "${tags}" | jq -r '.models | length' 2>/dev/null || echo "")"
    first="$(printf '%s\n' "${tags}" | jq -r '.models[0].name // empty' 2>/dev/null || echo "")"
    if [[ -n "${count}" ]]; then
      if [[ -n "${first}" ]]; then
        printf '  - %s (models: %s, first: %s)\n' "${hp}" "${count}" "${first}"
      else
        printf '  - %s (models: %s)\n' "${hp}" "${count}"
      fi
      return 0
    fi
  fi
  local first
  first="$(printf '%s\n' "${tags}" | extract_first_model || true)"
  if [[ -n "${first}" ]]; then
    printf '  - %s (first model: %s)\n' "${hp}" "${first}"
  else
    printf '  - %s (models: unknown)\n' "${hp}"
  fi
}

# -------------------- curl command map --------------------
print_curl_map() {
  local base="$1"
  cat <<MAP

=== Curl Command Map (Ollama HTTP API) ===
Base URL:
  ${base}

# Info
curl -sS --max-time ${CURL_TIMEOUT_SECS} ${base}/api/v1
curl -sS --max-time ${CURL_TIMEOUT_SECS} ${base}/api/tags
curl -sS --max-time ${CURL_TIMEOUT_SECS} ${base}/api/ps

# Pull model
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X POST ${base}/api/pull -H 'Content-Type: application/json' \\
  -d '{"model":"<model>","stream":false}'

# Show model
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X POST ${base}/api/show -H 'Content-Type: application/json' \\
  -d '{"model":"<model>"}'

# Create model (from base)
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X POST ${base}/api/create -H 'Content-Type: application/json' \\
  -d '{"model":"<new_model>","from":"<base_model>","system":"<system_prompt>","stream":false}'

# Copy model
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X POST ${base}/api/copy -H 'Content-Type: application/json' \\
  -d '{"source":"<source_model>","destination":"<dest_model>"}'

# Push model
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X POST ${base}/api/push -H 'Content-Type: application/json' \\
  -d '{"model":"<model>","stream":false}'

# Delete model
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X DELETE ${base}/api/delete -H 'Content-Type: application/json' \\
  -d '{"model":"<model>"}'

# Generate (prompt)
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X POST ${base}/api/generate -H 'Content-Type: application/json' \\
  -d '{"model":"<model>","prompt":"<prompt>","stream":false}'

# Chat (messages)
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X POST ${base}/api/chat -H 'Content-Type: application/json' \\
  -d '{"model":"<model>","messages":[{"role":"user","content":"<message>"}],"stream":false}'

# Embeddings
curl -sS --max-time ${CURL_TIMEOUT_SECS} -X POST ${base}/api/embed -H 'Content-Type: application/json' \\
  -d '{"model":"<embedding_model>","input":["text a","text b"],"truncate":true}'

MAP
}

# -------------------- main --------------------
info "you have ${READ_TIMEOUT_SECS} seconds to enter a target host/ip (Enter uses default: ${DEFAULT_HOST})..."
HOST_INPUT=""
read_with_timeout HOST_INPUT "enter host/ip: " "${READ_TIMEOUT_SECS}"
HOST_INPUT="${HOST_INPUT:-$DEFAULT_HOST}"
HOST_INPUT="$(strip_scheme "${HOST_INPUT}")"

info "you have ${READ_TIMEOUT_SECS} seconds to enter a target port (Enter uses default: ${DEFAULT_PORT})..."
PORT_INPUT=""
read_with_timeout PORT_INPUT "enter port number: " "${READ_TIMEOUT_SECS}"

if [[ -z "${PORT_INPUT}" ]]; then
  PORT="${DEFAULT_PORT}"
else
  if is_valid_port "${PORT_INPUT}"; then
    PORT="${PORT_INPUT}"
  else
    warn "invalid port '${PORT_INPUT}', using default ${DEFAULT_PORT}"
    PORT="${DEFAULT_PORT}"
  fi
fi

BASE="http://${HOST_INPUT}:${PORT}"
API="${BASE}/api"
TARGET_IS_LOCAL="n"
is_local_host "${HOST_INPUT}" && TARGET_IS_LOCAL="y"

SCAN_CHOICE="n"
info "you have ${READ_TIMEOUT_SECS} seconds to choose LAN scan (default: N)..."
read_yesno_timeout SCAN_CHOICE "Scan LAN for Ollama servers via HTTP probes? (y/N) " "${READ_TIMEOUT_SECS}" "N"

FOUND_LIST=()
if [[ "${SCAN_CHOICE}" == "y" ]]; then
  hr "LAN Discovery (HTTP probe to /api/v1)"

  have xargs || { warn "xargs not found; skipping LAN discovery."; SCAN_CHOICE="n"; }

  if [[ "${SCAN_CHOICE}" == "y" ]]; then
    scan_prefix_default="$(default_scan_prefix)"

    info "you have ${READ_TIMEOUT_SECS} seconds to enter LAN prefix A.B.C (Enter uses default: ${scan_prefix_default})..."
    SCAN_PREFIX=""
    read_with_timeout SCAN_PREFIX "enter LAN prefix: " "${READ_TIMEOUT_SECS}"
    SCAN_PREFIX="${SCAN_PREFIX:-$scan_prefix_default}"

    info "you have ${READ_TIMEOUT_SECS} seconds to enter host range start (Enter uses default: 1)..."
    SCAN_START=""
    read_with_timeout SCAN_START "enter start (1-254): " "${READ_TIMEOUT_SECS}"
    SCAN_START="${SCAN_START:-1}"

    info "you have ${READ_TIMEOUT_SECS} seconds to enter host range end (Enter uses default: 254)..."
    SCAN_END=""
    read_with_timeout SCAN_END "enter end (1-254): " "${READ_TIMEOUT_SECS}"
    SCAN_END="${SCAN_END:-254}"

    info "you have ${READ_TIMEOUT_SECS} seconds to enter ports (space-separated) (Enter uses default: \"18080 11434\")..."
    SCAN_PORTS=""
    read_with_timeout SCAN_PORTS "enter ports: " "${READ_TIMEOUT_SECS}"
    SCAN_PORTS="${SCAN_PORTS:-18080 11434}"

    info "Scan settings:"
    info "  prefix: ${SCAN_PREFIX}.X"
    info "  range:  ${SCAN_START}..${SCAN_END}"
    info "  ports:  ${SCAN_PORTS}"
    info "  parallel probes: ${SCAN_PARALLEL}"
    info "  connect-timeout: ${SCAN_CONNECT_TIMEOUT}s, max-time: ${CURL_TIMEOUT_SECS}s"

    FOUND_TMP="$(mktemp -t ollama_found.XXXXXX)"

    export -f probe_host_port
    export SCAN_CONNECT_TIMEOUT CURL_TIMEOUT_SECS

    {
      for i in $(seq "${SCAN_START}" "${SCAN_END}"); do
        ip="${SCAN_PREFIX}.${i}"
        for p in ${SCAN_PORTS}; do
          echo "${ip} ${p}"
        done
      done
    } | xargs -n2 -P "${SCAN_PARALLEL}" bash -c 'probe_host_port "$1" "$2"' _ \
        2>/dev/null | sort -u > "${FOUND_TMP}" || true

    if [[ -s "${FOUND_TMP}" ]]; then
      ok "Found Ollama-like HTTP responders:"
      while IFS=$'\t' read -r hp _; do
        FOUND_LIST+=("${hp}")
      done < "${FOUND_TMP}"

      for hp in "${FOUND_LIST[@]}"; do
        print_found_summary "${hp}"
      done

      info "LAN discovery is read-only (HTTP). You cannot stop/kill remote Ollama without privileges on that host."
      echo
    else
      warn "No Ollama responders found in the scanned range."
    fi
  fi
fi

if [[ "${#FOUND_LIST[@]}" -gt 0 ]]; then
  info "you have ${READ_TIMEOUT_SECS} seconds to choose a discovered target (Enter keeps: ${HOST_INPUT}:${PORT})..."
  info "Format: ip:port (example: 10.0.0.155:18080)"
  PICK=""
  read_with_timeout PICK "target ip:port: " "${READ_TIMEOUT_SECS}"
  if [[ -n "${PICK}" && "${PICK}" =~ ^([^:]+):([0-9]{1,5})$ ]]; then
    HOST_INPUT="${BASH_REMATCH[1]}"
    PORT="${BASH_REMATCH[2]}"
    BASE="http://${HOST_INPUT}:${PORT}"
    API="${BASE}/api"
    TARGET_IS_LOCAL="n"
    is_local_host "${HOST_INPUT}" && TARGET_IS_LOCAL="y"
  fi
fi

if [[ "${TARGET_IS_LOCAL}" == "y" ]]; then
  hr "Local Diagnostics (target is local)"

  if check_lsof_port "${PORT}"; then info "process found via lsof on port ${PORT}."
  else info "no process found via lsof on port ${PORT}."
  fi

  if check_netstat_port "${PORT}"; then info "netstat/ss shows LISTEN on port ${PORT}."
  else info "netstat/ss shows no LISTEN on port ${PORT}."
  fi

  if systemd_is_active "${SERVICE_NAME}"; then info "Ollama service is active"
  else info "Ollama service is inactive"
  fi

  if systemd_is_enabled "${SERVICE_NAME}"; then
    ans=""
    read -r -p "Disable Ollama at boot? (y/N) " ans
    ans="${ans:-N}"
    case "$ans" in
      y|Y|yes|YES) run_priv systemctl disable "${SERVICE_NAME}" >/dev/null || true; info "Ollama disabled at boot." ;;
      *) warn "Ollama runs at boot"; warn "use 'sudo systemctl disable ${SERVICE_NAME}' to disable manually" ;;
    esac
  fi

  if ufw_installed && ufw_is_active; then
    UFW_CHOICE="n"
    info "you have ${READ_TIMEOUT_SECS} seconds to choose UFW lockdown (default: N)..."
    read_yesno_timeout UFW_CHOICE "Configure UFW for localhost-only on port ${PORT}? (y/N) " "${READ_TIMEOUT_SECS}" "N"
    if [[ "${UFW_CHOICE}" == "y" ]]; then
      existing="$(ufw_show_relevant_rules "${PORT}")"
      [[ -n "${existing}" ]] && ufw_remove_existing_port_rules_prompt "${PORT}"
      ufw_lockdown_localhost_only "${PORT}"
      run_priv ufw status verbose || true
    else
      info "Skipping UFW changes."
    fi
  else
    info "UFW not active/installed; skipping firewall configuration."
  fi
else
  hr "Remote Target Notice"
  info "Target is remote: ${HOST_INPUT}:${PORT}"
  info "Remote stop/kill/disable operations are NOT possible without privileges on that host."
  info "Only HTTP/API verification will be performed."
fi

hr "HTTP API Connectivity Check (REQUIRED)"
info "Testing Ollama server at: ${BASE}"
info "curl max-time: ${CURL_TIMEOUT_SECS}s"

ver_json=""
if ! ver_json="$(curl_json GET "${API}/version" 2>/dev/null)"; then
  err "Unable to reach ${API}/version"
  err "If the remote host restricts to localhost, run on that host or use an SSH tunnel."
  exit 1
fi
info "Ollama server responded to /api/v1:"
printf '%s\n' "${ver_json}" | pretty

tags_json=""
if ! tags_json="$(curl_json GET "${API}/tags" 2>/dev/null)"; then
  err "Unable to reach ${API}/tags"
  exit 1
fi
info "Installed models (/api/tags):"
printf '%s\n' "${tags_json}" | pretty

ps_json="$(curl_json GET "${API}/ps" 2>/dev/null || true)"
info "Running models (/api/ps):"
if [[ -n "${ps_json}" ]]; then printf '%s\n' "${ps_json}" | pretty
else info "(no response / none running)"
fi

hr "Interactive Chat Test (REQUIRED)"

model_default="${DEFAULT_MODEL}"
if [[ -z "${model_default}" ]]; then
  model_default="$(printf '%s\n' "${tags_json}" | extract_first_model || true)"
fi
[[ -z "${model_default}" ]] && model_default="(type a model name)"

info "you have ${READ_TIMEOUT_SECS} seconds to enter a model (Enter uses default: ${model_default})..."
MODEL_INPUT=""
read_with_timeout MODEL_INPUT "enter model: " "${READ_TIMEOUT_SECS}"
MODEL="${MODEL_INPUT:-$model_default}"

if [[ "${MODEL}" == "(type a model name)" || -z "${MODEL}" ]]; then
  read -r -p "enter model (required): " MODEL
fi
MODEL="${MODEL:-}"
[[ -z "${MODEL}" ]] && { err "No model specified; cannot run chat test."; exit 1; }

info "Default prompt (editable):"
info "  ${DEFAULT_PROMPT}"
info "you have ${READ_TIMEOUT_SECS} seconds to enter a prompt (Enter uses default)..."
PROMPT_INPUT=""
read_with_timeout PROMPT_INPUT "enter prompt: " "${READ_TIMEOUT_SECS}"
PROMPT="${PROMPT_INPUT:-$DEFAULT_PROMPT}"

chat_body="{\"model\":$(json_escape "${MODEL}"),\"messages\":[{\"role\":\"user\",\"content\":$(json_escape "${PROMPT}")}],\"stream\":false}"
info "Calling /api/chat (model=${MODEL})..."
chat_json="$(curl_json POST "${API}/chat" "${chat_body}" 2>/dev/null || true)"

if [[ -z "${chat_json}" ]]; then
  err "No response from /api/chat. Verify the model exists and the server can run it."
  exit 1
fi

if have jq; then
  info "Chat response (message.content):"
  printf '%s\n' "${chat_json}" | jq -r '.message.content // .response // empty'
else
  info "Chat raw JSON response:"
  printf '%s\n' "${chat_json}"
fi

hr "Curl Command Map"
print_curl_map "${BASE}"

ok "Ollama HTTP API connectivity verified"
