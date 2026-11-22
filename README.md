# Rheum Revise — Android APK build

This repository wraps the original Claude **Rheum Revise** web app as a native Android WebView application. The original 455-question `data.js`, quiz logic and layout are included in `app/src/main/assets`. It works offline without GitHub Pages or an internet connection. Study progress is stored by Android WebView on the device.

## Build an APK with GitHub on iPhone

1. Create a GitHub repository (preferably **private**). Upload **all contents** of this extracted Android project, keeping `.github/workflows/android-apk.yml` and the `app/` folder in their correct paths. Do **not** upload only the ZIP.
2. In the repository, open **Actions → Build Android APK**. It should also build automatically after committing to the main branch. If necessary choose **Run workflow**.
3. Open the successful build, scroll to **Artifacts**, download **RheumRevise-Android-APK**.
4. Unzip the downloaded artifact to obtain `app-debug.apk`. On an **Android phone**, open the APK to install it; allow installation from that source when prompted.

**GitHub files:** `.github` is a hidden folder on some unzip/file-manager tools. Ensure the whole folder is uploaded. GitHub's web interface may not preserve folders if uploaded one file at a time; use the exact paths.

## Technical details

- Android app ID: `com.rheumrevise.app`
- Android Gradle Plugin 8.7.3, Gradle 8.9, Android SDK 35, Java 17 (target SDK 34)
- AndroidX `WebViewAssetLoader` serves packaged assets under a private HTTPS origin; no `INTERNET` permission needed.
- JavaScript and DOM storage are enabled to preserve quizzes, saved answers and last session. Google Fonts URLs were removed to keep the app completely offline, using the system fallback fonts.
- Builds a **debug** APK for personal testing; not a Play Store release. An unsigned/release-signed APK or AAB plus stable signing key is needed for distributing updates.

**Status:** Android compilation cannot be tested in this environment because the Android SDK/Gradle tooling is unavailable. GitHub Actions will compile it and report any errors. Do not interpret the ZIP itself as an APK.

## Original contents

The original `app/README.md` is preserved under Android assets for reference. The original PWA service worker is disabled only when running inside the Android shell; all assets are bundled locally.
