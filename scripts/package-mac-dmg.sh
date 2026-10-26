#!/usr/bin/env bash
# Package the already-built Apple Silicon apps and plugins in one disk image.
set -euo pipefail
VERSION="${1:-1.0.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ART="$ROOT/plugin/build-mac/P12Retro_artefacts/Release"
OUT="$ROOT/installer/Output"
CONTENTS="$(mktemp -d "${TMPDIR:-/tmp}/p12-dmg.XXXXXX")"
test -d "$ART/Standalone/P12 Retro.app"
test -d "$ART/VST3/P12 Retro.vst3"
mkdir -p "$OUT" "$CONTENTS/VST3" "$CONTENTS/AU"
ditto "$ART/Standalone/P12 Retro.app" "$CONTENTS/P12 Retro.app"
ditto "$ART/VST3/P12 Retro.vst3" "$CONTENTS/VST3/P12 Retro.vst3"
if [ -d "$ART/AU/P12 Retro.component" ]; then
  ditto "$ART/AU/P12 Retro.component" "$CONTENTS/AU/P12 Retro.component"
fi
DESKTOP="$ROOT/app/dist-mac-dir/mac-arm64/P-12 v1.0.app"
if [ -d "$DESKTOP" ]; then ditto "$DESKTOP" "$CONTENTS/P-12 Desktop.app"; fi
ln -s /Applications "$CONTENTS/Applications"
cat > "$CONTENTS/INSTALL.txt" <<'EOF'
P12 Retro for Apple Silicon

Drag P12 Retro.app (and optionally P-12 Desktop.app) into Applications.
Copy VST3/P12 Retro.vst3 to ~/Library/Audio/Plug-Ins/VST3/.
For AU hosts, copy AU/P12 Retro.component to ~/Library/Audio/Plug-Ins/Components/.
Create these folders if necessary, then restart/rescan your DAW.

Use P12 Save Project to preserve your work; automatic recovery saving is disabled.
This CI test build is not Apple-notarized. macOS may require explicit approval
in Privacy & Security before it will launch or load the plugin.
EOF
hdiutil create -volname "P12 Retro $VERSION" -srcfolder "$CONTENTS" \
  -format UDZO -ov "$OUT/P12-Retro-$VERSION-AppleSilicon.dmg"
hdiutil verify "$OUT/P12-Retro-$VERSION-AppleSilicon.dmg"
echo "DMG: $OUT/P12-Retro-$VERSION-AppleSilicon.dmg"
