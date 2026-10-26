#!/usr/bin/env bash
# P12 Retro — macOS build (Apple Silicon): VST3 + AU + Standalone,
# packaged as a .pkg installer.
#
# Requirements: Xcode command line tools, CMake 3.24+.
# Usage (repo root):  scripts/build-mac.sh [version]
# Optional signing (set in env): MAC_APP_SIGN_ID="Developer ID Application: ..."
#                                MAC_INSTALLER_SIGN_ID="Developer ID Installer: ..."
set -euo pipefail
VERSION="${1:-1.0.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/plugin/build-mac"
ART="$BUILD/P12Retro_artefacts/Release"
STAGE="$ROOT/installer/mac/stage"
OUT="$ROOT/installer/Output"

cmake -S "$ROOT/plugin" -B "$BUILD" -G Xcode \
  -DCMAKE_OSX_ARCHITECTURES=arm64 -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0
cmake --build "$BUILD" --config Release --target P12Retro_VST3 P12Retro_AU P12Retro_Standalone -- -quiet

# P-12 Desktop (Electron + arm64 native host). Set SKIP_DESKTOP=1 to skip.
if [ -z "${SKIP_DESKTOP:-}" ]; then
  ( cd "$ROOT/app" && bash scripts/build-native-mac.sh && npm install --no-audit --no-fund \
      && npx electron-builder --mac dir --arm64 --publish never --config.directories.output=dist-mac-dir )
fi

rm -rf "$STAGE" && mkdir -p "$STAGE/vst3" "$STAGE/au" "$STAGE/app" "$STAGE/desktop" "$OUT"
cp -R "$ART/VST3/P12 Retro.vst3" "$STAGE/vst3/"
cp -R "$ART/AU/P12 Retro.component" "$STAGE/au/"
cp -R "$ART/Standalone/P12 Retro.app" "$STAGE/app/"
DESKTOP_APP="$ROOT/app/dist-mac-dir/mac-arm64/P-12 v1.0.app"
[ -d "$DESKTOP_APP" ] && cp -R "$DESKTOP_APP" "$STAGE/desktop/P-12 Desktop.app"

if [ -n "${MAC_APP_SIGN_ID:-}" ]; then
  for b in "$STAGE/vst3/P12 Retro.vst3" "$STAGE/au/P12 Retro.component" "$STAGE/app/P12 Retro.app"; do
    codesign --force --deep --options runtime --timestamp --sign "$MAC_APP_SIGN_ID" "$b"
  done
fi

pkgbuild --root "$STAGE/vst3" --identifier com.p12.retro.vst3 --version "$VERSION" \
  --install-location "/Library/Audio/Plug-Ins/VST3" "$BUILD/vst3.pkg"
pkgbuild --root "$STAGE/au" --identifier com.p12.retro.au --version "$VERSION" \
  --install-location "/Library/Audio/Plug-Ins/Components" "$BUILD/au.pkg"
pkgbuild --root "$STAGE/app" --identifier com.p12.retro.app --version "$VERSION" \
  --install-location "/Applications" "$BUILD/app.pkg"

if [ -d "$STAGE/desktop/P-12 Desktop.app" ]; then
  pkgbuild --root "$STAGE/desktop" --identifier com.p12.retro.desktop --version "$VERSION" \
    --install-location "/Applications" "$BUILD/desktop.pkg"
  DESKTOP_LINE='<line choice="desktop"/>'
else
  DESKTOP_LINE=''
  rm -f "$BUILD/desktop.pkg"
fi
sed -e "s/@VERSION@/$VERSION/g" -e "s|<!--DESKTOP-->|$DESKTOP_LINE|" "$ROOT/installer/mac/distribution.xml" > "$BUILD/distribution.xml"
[ -n "$DESKTOP_LINE" ] || sed -i '' '/com.p12.retro.desktop/d;/choice id="desktop"/,/<\/choice>/d' "$BUILD/distribution.xml"
# (no empty-array expansion: macOS ships bash 3.2, where that fails under set -u)
if [ -n "${MAC_INSTALLER_SIGN_ID:-}" ]; then
  productbuild --distribution "$BUILD/distribution.xml" --package-path "$BUILD" \
    --resources "$ROOT/installer/mac" --sign "$MAC_INSTALLER_SIGN_ID" "$OUT/P12-Retro-$VERSION-mac.pkg"
else
  productbuild --distribution "$BUILD/distribution.xml" --package-path "$BUILD" \
    --resources "$ROOT/installer/mac" "$OUT/P12-Retro-$VERSION-mac.pkg"
fi
echo "Installer: $OUT/P12-Retro-$VERSION-mac.pkg"
