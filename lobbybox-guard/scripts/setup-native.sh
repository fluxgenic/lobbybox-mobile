#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TEMPLATE_NAME="LobbyboxGuardNativeTemplate"
RN_VERSION="0.74.3"
RN_CLI_PACKAGE="@react-native-community/cli"
RN_CLI_VERSION="13.6.9"

TMP_ROOT=$(mktemp -d 2>/dev/null || mktemp -d -t lobbybox-guard-native)
TEMPLATE_PATH="$TMP_ROOT/$TEMPLATE_NAME"

cleanup() {
  if [ -d "$TMP_ROOT" ]; then
    rm -rf "$TMP_ROOT"
  fi
}

trap cleanup EXIT

if [ -d "$PROJECT_ROOT/android" ] || [ -d "$PROJECT_ROOT/ios" ]; then
  echo "android or ios directories already exist. Remove them before running this script." >&2
  exit 1
fi

echo "Generating React Native native projects (android and ios)..."

if command -v npx.cmd >/dev/null 2>&1; then
  NPX_BIN="npx.cmd"
else
  NPX_BIN="npx"
fi

"$NPX_BIN" --yes ${RN_CLI_PACKAGE}@${RN_CLI_VERSION} init "$TEMPLATE_NAME" \
  --version ${RN_VERSION} \
  --directory "$TEMPLATE_PATH" \
  --skip-install \
  --install-pods false \
  --pm npm

ANDROID_SOURCE="$TEMPLATE_PATH/android"
IOS_SOURCE="$TEMPLATE_PATH/ios"

if [ ! -d "$ANDROID_SOURCE" ] || [ ! -d "$IOS_SOURCE" ]; then
  echo "React Native CLI did not generate the expected android/ios projects. Review the output above for details." >&2
  exit 1
fi

cp -R "$ANDROID_SOURCE" "$PROJECT_ROOT/android"
cp -R "$IOS_SOURCE" "$PROJECT_ROOT/ios"

cleanup

echo "android and ios directories have been generated."
