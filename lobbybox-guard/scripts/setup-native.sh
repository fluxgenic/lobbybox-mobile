#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TEMPLATE_NAME="LobbyboxGuardNativeTemplate"
RN_VERSION="0.74.3"

cleanup() {
  if [ -d "$PROJECT_ROOT/$TEMPLATE_NAME" ]; then
    rm -rf "$PROJECT_ROOT/$TEMPLATE_NAME"
  fi
}

trap cleanup EXIT

if [ -d "$PROJECT_ROOT/android" ] || [ -d "$PROJECT_ROOT/ios" ]; then
  echo "android or ios directories already exist. Remove them before running this script." >&2
  exit 1
fi

echo "Generating React Native native projects (android and ios)..."

npx --yes react-native@${RN_VERSION} init "$TEMPLATE_NAME" --skip-install

cp -R "$PROJECT_ROOT/$TEMPLATE_NAME/android" "$PROJECT_ROOT/android"
cp -R "$PROJECT_ROOT/$TEMPLATE_NAME/ios" "$PROJECT_ROOT/ios"

cleanup

echo "android and ios directories have been generated."
