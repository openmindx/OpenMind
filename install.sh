#!/usr/bin/env bash
# install.sh — OpenMind installer (Tauri 2 · React 19 · pnpm).
# Prereqs → pnpm deps → Rust/Tauri. Idempotent · --dry-run · --yes · --help.
# Run:  ./install.sh   then  pnpm tauri dev   (rebuild: pnpm tauri build)
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$HERE"
c(){ [ -t 1 ] && printf '\033[%sm%s\033[0m' "$1" "$2" || printf '%s' "$2"; }
ok(){ printf '  %s %s\n' "$(c '1;32' '✓')" "$*"; }; warn(){ printf '  %s %s\n' "$(c '1;33' '!')" "$*"; }
step(){ printf '\n%s %s\n' "$(c '1;36' '▶')" "$*"; }
DRY=0; for a in "$@"; do case "$a" in --dry-run) DRY=1;; -h|--help) sed -n '2,4p' "$0"|sed 's/^# //'; exit 0;; esac; done
run(){ [ "$DRY" = 1 ] && { printf '    %s %s\n' "$(c '2' 'would run:')" "$*"; return 0; }; eval "$@"; }
PKG_INSTALL=""; command -v apt-get>/dev/null && PKG_INSTALL="sudo apt-get install -y"; command -v apk>/dev/null && PKG_INSTALL="doas apk add"; command -v brew>/dev/null && PKG_INSTALL="brew install"

step "Prerequisites (node · pnpm · Rust)"
command -v node >/dev/null && ok "node $(node -v)" || { warn "node missing"; [ -n "$PKG_INSTALL" ] && run "$PKG_INSTALL nodejs"; }
if command -v pnpm >/dev/null; then ok "pnpm $(pnpm -v)"
else warn "pnpm missing → corepack"; run "corepack enable && corepack prepare pnpm@latest --activate" || run "npm i -g pnpm"; fi
command -v cargo >/dev/null && ok "cargo $(cargo --version|awk '{print $2}')" || { warn "Rust missing → rustup"; run "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"; }
pkg-config --exists webkit2gtk-4.1 2>/dev/null && ok "webkit2gtk (tauri) present" || warn "tauri needs webkit2gtk-4.1 + libgtk-3-dev (apt install libwebkit2gtk-4.1-dev build-essential libssl-dev)"

step "Dependencies (pnpm install)"
[ -d node_modules ] && ok "node_modules present" || run "pnpm install"

[ "$DRY" = 1 ] && { printf '\n%s dry-run complete.\n' "$(c '1;33' '●')"; exit 0; }
printf '\n%s\n' "$(c '1;32' 'OpenMind installed.')"; echo "  next: pnpm tauri dev   (build: pnpm tauri build)"
