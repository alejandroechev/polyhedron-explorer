#!/usr/bin/env bash
# Applied after `tauri android init`, which regenerates `src-tauri/gen/android`
# from scratch and therefore cannot be edited in place.
set -euo pipefail

GRADLE="src-tauri/gen/android/app/build.gradle.kts"
RES="src-tauri/gen/android/app/src/main/res"

if [ -f "$GRADLE" ]; then
  # API 28+ guarantees a WebView new enough for the WebGL features we use.
  sed -i'' -e 's/minSdk = 24/minSdk = 28/' "$GRADLE"
  echo "minSdk set to 28"
fi

if [ -d "src-tauri/icons/android" ]; then
  # Copies the adaptive-icon mipmaps *and* values/ic_launcher_background.xml.
  # Without the colour resource, aapt fails with
  # "resource color/ic_launcher_background not found".
  cp -r src-tauri/icons/android/. "$RES/"
  echo "copied launcher icons and resources"
  test -f "$RES/values/ic_launcher_background.xml" ||
    { echo "launcher background colour missing"; exit 1; }
fi
