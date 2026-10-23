# Developer Friction Log & Product Feedback

This log documents real friction points encountered during development, how they were resolved or worked around, and suggestions for the tooling/platform maintainers.

---

### Entry 1: Host Machine Environment & Clean Tooling Bootstrap
- **Context:** Bootstrapping Android TV / Fire TV development environment from scratch on a Windows workstation.
- **What Happened:** Host only had Java 26 (bleeding-edge early access) and no pre-existing Android SDK or emulator configured in standard PATH. Android Gradle Plugin (AGP) and Gradle 8.x require Java 17 or 21 and will fail with unsupported class file errors on Java 26.
- **Resolution:** Bootstrapped self-contained Eclipse Temurin JDK 17 and Android command-line tools into `.tools/` and `.android-sdk/` directly within the allowed workspace without polluting global system paths.
- **Suggestion for Amazon / Android TV Docs:** Provide an all-in-one lightweight command-line setup script (or containerized emulator bundle) specifically tailored for Fire TV web-wrapper apps so developers don't have to manually configure 4GB+ standard Android Studio components for lightweight WebView apps.

---

### Entry 2: Commandline Tools Directory Nesting Convention
- **Context:** Installing SDK components using `sdkmanager.bat`.
- **What Happened:** Extracting the downloaded `commandlinetools-win-*_latest.zip` into `cmdline-tools/latest/` placed batch files directly in `latest/`. When `sdkmanager.bat` ran, it attempted to resolve Java libraries via `%~dp0\..\lib`, failing with `ClassNotFoundException: com.android.sdklib.tool.sdkmanager.SdkManagerCli`.
- **Resolution:** Moved batch scripts into `cmdline-tools/latest/bin/`, restoring the expected directory hierarchy.
- **Suggestion:** Modernize the batch launcher scripts to check both `%~dp0\lib` and `%~dp0\..\lib` automatically.

---

### Entry 3: Debug Application ID Suffix vs Leanback Launcher Intent
- **Context:** Deploying debug APK to Android TV emulator via ADB.
- **What Happened:** Having `applicationIdSuffix = ".debug"` altered the runtime package name to `com.familywatch.referee.debug`, causing direct `am start -n com.familywatch.referee/.MainActivity` invocations to fail with ActivityNotFound.
- **Resolution:** Removed the suffix to maintain a single uniform package identifier (`com.familywatch.referee`) across development, ADB automation, and Leanback launcher registrations.
- **Suggestion:** Maintainers of Fire OS quickstart templates should default to unified package IDs to prevent discrepancies when testing with ADB.

---

### Entry 4: CORS Restrictions in Local WebView Assets for AWS Bedrock
- **Context:** Calling Amazon Bedrock Converse / InvokeModel API from a Fire TV WebView.
- **What Happened:** When web assets are served locally from `file:///android_asset/www/index.html`, browser `fetch()` calls to `bedrock-runtime.amazonaws.com` are blocked by strict WebView CORS and origin policies.
- **Resolution:** Designed a native Kotlin `@JavascriptInterface` bridge (`BedrockBridge`) in `MainActivity.kt` that signs requests using AWS Signature Version 4 (SigV4) and calls Bedrock directly via native `HttpURLConnection`. This completely avoids browser CORS while also keeping the APK under 2.4 MB without bundling heavy AWS SDK JARs.
- **Suggestion:** Amazon could provide an official first-party Fire OS JavaScript bridge module in Fire TV Web App starter templates for AWS Bedrock.

---
