#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:?ANDROID_HOME must be set}"

# Keep the command-line tools compatible with the project's Java 17 / AGP 8.7 build.
tools_zip="${TMPDIR:-/tmp}/p12-android-commandline-tools.zip"
curl --fail --location --retry 3 https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o "$tools_zip"
mkdir -p "$ANDROID_HOME/cmdline-tools"
unzip -q -o "$tools_zip" -d "$ANDROID_HOME/cmdline-tools"
mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
# yes can receive SIGPIPE after sdkmanager exits; check sdkmanager's status itself.
set +o pipefail
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses >/dev/null
set -o pipefail
sdkmanager --sdk_root="$ANDROID_HOME" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0'

mkdir -p dist
keystore=""
trap 'if [[ -n "$keystore" ]]; then rm -f "$keystore"; fi' EXIT
if [[ -n "${P12_KEYSTORE_BASE64:-}" ]]; then
  : "${P12_KEYSTORE_PASSWORD:?Set P12_KEYSTORE_PASSWORD}"
  : "${P12_KEY_ALIAS:?Set P12_KEY_ALIAS}"
  : "${P12_KEY_PASSWORD:?Set P12_KEY_PASSWORD}"
  keystore="$(mktemp)"
  printf '%s' "$P12_KEYSTORE_BASE64" | base64 --decode > "$keystore"
  export P12_KEYSTORE="$keystore"
  gradle --no-daemon -p android :app:assembleRelease
  cp android/app/build/outputs/apk/release/app-release.apk dist/P12-Retro-Android.apk
else
  # Do not accidentally use a keystore inherited from a runner's environment.
  unset P12_KEYSTORE
  gradle --no-daemon -p android :app:assembleDebug
  cp android/app/build/outputs/apk/debug/app-debug.apk dist/P12-Retro-Android-debug.apk
fi
