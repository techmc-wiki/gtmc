#!/usr/bin/env bash
set -euo pipefail

dnf install -y \
  nspr nss atk at-spi2-atk cups-libs libdrm libxkbcommon mesa-libgbm \
  pango cairo alsa-lib gtk3 libX11 libXcomposite libXdamage libXext \
  libXfixes libXrandr libxcb dbus-libs expat glib2

SHELL=/bin/bash npx --yes get-pnpm@0.0.3 12.0.0
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME/bin:$PATH"
GTMC_SKIP_POSTINSTALL=1 pnpm install --frozen-lockfile
