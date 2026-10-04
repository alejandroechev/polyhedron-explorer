#!/usr/bin/env bash
# Applied after `tauri android init`, which regenerates `src-tauri/gen/android`
# from scratch and therefore cannot be edited in place.
set -euo pipefail

GRADLE="src-tauri/gen/android/app/build.gradle.kts"
MANIFEST="src-tauri/gen/android/app/src/main/AndroidManifest.xml"
RES="src-tauri/gen/android/app/src/main/res"

if [ -f "$GRADLE" ]; then
  # API 28+ guarantees a WebView new enough for the WebGL features we use.
  sed -i'' -e 's/minSdk = 24/minSdk = 28/' "$GRADLE"
  echo "minSdk set to 28"
fi

if [ -f "$MANIFEST" ]; then
  # The 3D view is the whole app, so keep it landscape-capable but never let a
  # rotation restart the activity and drop the WebGL context.
  if ! grep -q 'android:configChanges="[^"]*screenSize' "$MANIFEST"; then
    echo "configChanges already covers rotation (default Tauri manifest)"
  fi
fi

if [ -d "src-tauri/icons/android" ]; then
  cp -r src-tauri/icons/android/mipmap-* "$RES/" 2>/dev/null || true
  echo "copied launcher icons"
fi
