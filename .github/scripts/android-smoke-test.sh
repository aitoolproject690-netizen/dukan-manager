#!/usr/bin/env bash
set -u

PACKAGE="${ANDROID_PACKAGE:-com.dukkaan.manager}"
APK="$GITHUB_WORKSPACE/Dukaan-Dashboard/artifacts/mobile/android/app/build/outputs/apk/release/app-release.apk"
LOG="/tmp/dukaan-logcat.txt"

fail_with_diagnostics() {
  echo "APP PROCESS NOT RUNNING"
  echo "--- TOP ACTIVITY ---"
  adb shell dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity' || true
  echo "--- EXIT INFO ---"
  adb shell dumpsys activity exit-info "$PACKAGE" || true
  echo "--- ERROR LOGCAT ---"
  adb logcat -d -b all -v time | grep -E "($PACKAGE|AndroidRuntime|ReactNative|ReactNativeJS|FATAL|Fatal|Exception|SIG|AppRegistry|Expo native runtime)" | tail -n 1200 || true
  return 1
}

echo "--- APK CHECK ---"
test -s "$APK" || { echo "APK missing or empty: $APK"; exit 1; }

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

echo "--- CRASH CHECK ---"
adb logcat -d -b all -v time > "$LOG"
if grep -Eq "FATAL EXCEPTION|AndroidRuntime.*FATAL|Process: $PACKAGE .*has died|Fatal signal|ReactNativeJS.*(Error|Invariant Violation)|Expo native runtime is not available|Module AppRegistry is not a registered callable" "$LOG"; then
  echo "ANDROID RUNTIME CRASH DETECTED"
  grep -E "($PACKAGE|AndroidRuntime|ReactNative|ReactNativeJS|FATAL|Fatal|Exception|SIG|AppRegistry|Expo native runtime)" "$LOG" | tail -n 1200 || true
  exit 1
fi

echo "Android launch smoke test passed."
