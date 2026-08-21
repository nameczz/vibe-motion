#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ROOT="$ROOT/build/mac-lock-launcher"
APP="$BUILD_ROOT/3D Chladni Lock.app"
CONTENTS="$APP/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
SOURCE="$ROOT/macos-lock-launcher/Sources/main.swift"
ARCH_BIN="$BUILD_ROOT/arch"

rm -rf "$BUILD_ROOT"
mkdir -p "$MACOS" "$RESOURCES" "$ARCH_BIN"
plutil -lint "$ROOT/macos-localization/en.lproj/Localizable.strings" "$ROOT/macos-localization/zh-Hans.lproj/Localizable.strings" >/dev/null

for ARCH in arm64 x86_64; do
  xcrun swiftc \
    -parse-as-library \
    -O \
    -whole-module-optimization \
    -target "$ARCH-apple-macosx13.0" \
    -framework AppKit \
    -framework ScreenSaver \
    "$SOURCE" \
    -o "$ARCH_BIN/$ARCH"
done

lipo -create "$ARCH_BIN/arm64" "$ARCH_BIN/x86_64" -output "$MACOS/3D Chladni Lock"
cp "$ROOT/macos-lock-launcher/Info.plist" "$CONTENTS/Info.plist"
cp "$ROOT/desktop/assets/sound-motion-icon.icns" "$RESOURCES/sound-motion-icon.icns"
ditto "$ROOT/macos-localization/en.lproj" "$RESOURCES/en.lproj"
ditto "$ROOT/macos-localization/zh-Hans.lproj" "$RESOURCES/zh-Hans.lproj"

codesign --force --deep --sign - "$APP" >/dev/null
codesign --verify --deep --strict "$APP"
"$MACOS/3D Chladni Lock" -AppleLanguages '(en)' --smoke | grep -q 'language=Cosmic Web'
"$MACOS/3D Chladni Lock" -AppleLanguages '(zh-Hans)' --smoke | grep -q 'language=宇宙网'
echo "$APP"
