#!/bin/bash
set -euo pipefail
binary=$1
: "${MACOS_CERTIFICATE_P12_BASE64:?Secret belum diatur}"
: "${MACOS_CERTIFICATE_PASSWORD:?Secret belum diatur}"
: "${MACOS_SIGNING_IDENTITY:?Secret belum diatur}"
: "${APPLE_ID:?Secret belum diatur}"
: "${APPLE_APP_PASSWORD:?Secret belum diatur}"
: "${APPLE_TEAM_ID:?Secret belum diatur}"
signing_dir=$(mktemp -d "${RUNNER_TEMP:?}/agent-signing.XXXXXX")
keychain="$signing_dir/signing.keychain-db"
keychain_password=$(openssl rand -hex 32)
cleanup() {
  security delete-keychain "$keychain" >/dev/null 2>&1 || true
  # Fixed, explicitly named files in the private temporary directory.
  rm -f "$signing_dir/cert.p12" "$signing_dir/notarization.zip" "$signing_dir/result.json"
  rmdir "$signing_dir" 2>/dev/null || true
}
trap cleanup EXIT
printf '%s' "$MACOS_CERTIFICATE_P12_BASE64" | base64 -D > "$signing_dir/cert.p12"
security create-keychain -p "$keychain_password" "$keychain"
security set-keychain-settings -lut 21600 "$keychain"
security unlock-keychain -p "$keychain_password" "$keychain"
security import "$signing_dir/cert.p12" -P "$MACOS_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k "$keychain"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$keychain_password" "$keychain" >/dev/null
codesign --force --options runtime --timestamp --keychain "$keychain" --sign "$MACOS_SIGNING_IDENTITY" "$binary"
codesign --verify --strict --verbose=2 "$binary"
ditto -c -k --keepParent "$binary" "$signing_dir/notarization.zip"
xcrun notarytool submit "$signing_dir/notarization.zip" --apple-id "$APPLE_ID" --password "$APPLE_APP_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait --output-format json > "$signing_dir/result.json"
if ! jq -e '.status == "Accepted"' "$signing_dir/result.json" >/dev/null; then
  jq '{id, status, message}' "$signing_dir/result.json"
  exit 1
fi
# Standalone CLI binaries cannot carry a stapled ticket; Gatekeeper checks online.
