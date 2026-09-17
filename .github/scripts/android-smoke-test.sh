#!/usr/bin/env bash
set -euo pipefail

PACKAGE="${ANDROID_PACKAGE:-com.dukkaan.manager}"
APK="$GITHUB_WORKSPACE/Dukaan-Dashboard/artifacts/mobile/android/app/build/outputs/apk/release/app-release.apk"
LOG="/tmp/dukaan-logcat.txt"

fail_with_diagnostics() {
  echo "APP PROCESS NOT RUNNING"
  echo "--- TOP ACTIVITY ---"
  adb shell dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity' || true
  echo "--- EXIT INFO ---"
  adb shell dumpsys activity exit-info "$PACKAGE" || true
  echo "--- APP/REACT LOGCAT ---"
  adb logcat -d -b all -v time | grep -E "($PACKAGE|ReactNativeJS|Expo native runtime|AppRegistry)" | tail -n 1200 || true
  echo "--- ANDROID RUNTIME LOGCAT ---"
  adb logcat -d -b all -v time | grep -E "AndroidRuntime|FATAL EXCEPTION|Fatal signal|has died" | tail -n 400 || true
  return 1
}

echo "--- APK CHECK ---"
test -s "$APK"
echo "Verified APK: $APK"

echo "--- INSTALL APK ---"
adb install -r "$APK"
adb shell am force-stop "$PACKAGE"
adb logcat -c

echo "--- LAUNCH APK ---"
adb shell am start -W -n "$PACKAGE/.MainActivity"

# Give the React/Expo runtime time to initialize, then sample repeatedly so a slow
# cold start is not mistaken for an immediate crash.
for i in 1 2 3 4 5 6; do
  sleep 5
  echo "--- STARTUP SAMPLE $i ---"
  adb shell pidof "$PACKAGE" || true
  adb shell dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity' || true
done

echo "--- PROCESS ---"
if ! adb shell pidof "$PACKAGE" | grep -Eq '[0-9]+'; then
  fail_with_diagnostics
fi

echo "--- APP-SPECIFIC CRASH CHECK ---"
adb logcat -d -b all -v time > "$LOG"
# Only fail on errors attributable to our package/React JS runtime. Do not fail
# because Google Play Services or another emulator component crashes.
if grep -Eq "$PACKAGE.*(FATAL|Fatal|Exception|has died)|ReactNativeJS.*(Error|Invariant Violation)|Expo native runtime is not available|Module AppRegistry is not a registered callable" "$LOG"; then
  echo "DUKAAN APP RUNTIME CRASH DETECTED"
  grep -E "($PACKAGE|ReactNativeJS|Expo native runtime|AppRegistry)" "$LOG" | tail -n 1200 || true
  exit 1
fi

echo "Android launch smoke test passed for $PACKAGE."
