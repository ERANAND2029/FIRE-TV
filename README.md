# Family Watch Referee 📺⚖️

> **The AI Household Compromise Engine for Fire TV & Android TV**  
> *Ending the nightly "Aaj kya dekhein?" living room argument once and for all.*

---

## 🏆 Amazon Developer Hackathon Submission
- **Track:** Fire TV
- **Target OS:** Fire OS / Android TV (Leanback API 30+, TV 1080p, 10-foot UI)
- **License:** MIT Open Source (Current Year, `LICENSE` included)
- **Repository:** [https://github.com/ERANAND2029/FIRE-TV](https://github.com/ERANAND2029/FIRE-TV)

---

## 💡 The Problem & Inspiration
In millions of Indian living rooms, prime-time television starts with friction:
- **Papa** wants a grounded thriller, but refuses anything longer than 90 minutes because of morning office meetings.
- **Mummy** wants lighthearted family comedy or heartwarming drama.
- **Bhai** wants high-octane action or sci-fi.
- **Chhotu** (the youngest) cannot watch anything violent or mature—requiring strict **U** age ratings.

The result? Over 30 minutes wasted scrolling through streaming rows, leading to frustration and compromise fatigue.

**Family Watch Referee** is a dedicated 10-foot living room app designed specifically for the Fire TV remote control. Using a multi-constraint compromise algorithm + natural Hinglish AI arbitration, it finds the **single best compromise title** for whoever is on the sofa tonight, justifies it in one witty sentence, and gets the family watching together in under 10 seconds.

---

## ✨ Features (Priority Order)

1. **Remote-First Home Screen (4 Profiles):**
   - Default cards for **Papa**, **Mummy**, **Bhai**, and **Chhotu**.
   - Left/Right D-pad moves focus with a thick high-contrast gold focus ring and 1.08x scale zoom.
   - **OK / Enter** toggles participation (`Watching` vs `Skipping`).

2. **Per-Profile Remote Preferences:**
   - D-pad Down drops directly into each member's mood selector (**Action**, **Comedy**, **Family**, **Thriller**, **Chill**) and max runtime limit (**60m**, **90m**, **120m**).
   - **Chhotu Kid-Safety Lock:** Activating Chhotu enforces a strict hard constraint—instantly pruning all non-`U` rated content from the entire catalog.

3. **Multi-Constraint AI Referee ("Decide!" Engine):**
   - Evaluates a 25-title fictional catalog (`catalog.json`—zero trademarks, zero copyrighted assets).
   - Scores candidates based on mood consensus, heavily penalizes titles that exceed any active member's bedtime limit, and applies a unanimity bonus.

4. **Witty Hinglish AI Explanation (`explainPick`):**
   - Returns a friendly, funny 1-line justification (e.g., *"Chhotu ke liye safe U-rating, Papa ko mast story, aur 92 min mein bedtime sorted!"*).
   - Instant offline rule-based fallback works anywhere with zero network.
   - **Optional Amazon Bedrock Integration:** If configured with AWS credentials, calls Claude 3 via native Kotlin bridge for real-time generative verdicts.

5. **Result Screen & Simulated Leanback Player:**
   - Cinematic poster card with vibrant gradient, title, runtime, age badge, and match percentage.
   - **Play Now:** Launches a simulated TV video player with dynamic progress bar and playback controls.
   - **Decide Again:** Surfaces the next best compromise option in real-time.

6. **Persistent Household Memory (`localStorage`):**
   - Tracks past watches and applies a repeat penalty to ensure fresh variety.
   - Context-aware adaptation: detects weekend vs. weekday prime times and late-night bedtime thresholds.
   - Dynamic memory ribbon: *"Pichli baar Comedy dekhi thi, aaj weekend par broad family title try karte hain."*

7. **Voice Input Flow (Beta):**
   - Remote voice intent modal allowing natural requests like *"Papa and Mummy want Comedy 90 minutes"*.

---

## 🏛️ Architecture

```
                       +---------------------------------------+
                       |           Fire TV Remote              |
                       |       (D-Pad Arrow Keys + OK)         |
                       +---------------------------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |      Leanback Native Shell            |
                       |  - MainActivity.kt (Kotlin)           |
                       |  - LEANBACK_LAUNCHER intent filter    |
                       |  - Fullscreen Hardware Accelerated    |
                       |  - App Banner (320x180 vector)        |
                       |  - Zero heavy external SDK dependencies|
                       +---------------------------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |   10-Foot Leanback Web Engine (assets)|
                       |  - HTML5 / CSS3 / Vanilla JS (No npm) |
                       |  - Spatial Focus Manager (D-Pad nav)  |
                       |  - High-Contrast Theme (min 28px font)|
                       |  - Web Audio Synthesized TV Chimes    |
                       +---------------------------------------+
                          |                                 |
                          v                                 v
        +-----------------------------------+   +----------------------------+
        |   Offline Arbitration Engine      |   |   Optional Amazon Bedrock  |
        | - Multi-member mood consensus     |   |   Claude 3 Haiku / Sonnet  |
        | - Hard Chhotu Kid-Safety Filter   |   |   via Native SigV4 Bridge  |
        | - Strict Bedtime Penalty          |   |   (Zero CORS issues)       |
        | - Household Memory (localStorage) |   +----------------------------+
        +-----------------------------------+
```

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Windows, macOS, or Linux workstation
- Java JDK 17+
- Android SDK with Platform 34 and Build-Tools 34.0.0
- Android TV Emulator (API 30+, TV 1080p system image) or physical Fire TV device connected via `adb`

### 1. Clone Repository
```bash
git clone https://github.com/ERANAND2029/FIRE-TV.git
cd FIRE-TV
```

### 2. Build the Debug APK
```bash
# On Windows:
.\gradlew.bat assembleDebug

# On Linux / macOS:
./gradlew assembleDebug
```
The output APK is generated at:
`app/build/outputs/apk/debug/app-debug.apk` *(Size: ~2.3 MB)*.

### 3. Create & Start Android TV Emulator
```bash
# Create Android TV 1080p AVD (if not already created)
avdmanager create avd -n FamilyWatchTV -k "system-images;android-30;google-tv;x86" -d "tv_1080p"

# Launch emulator
emulator -avd FamilyWatchTV -no-audio -no-boot-anim
```

### 4. Install & Launch on Fire TV / Emulator
```bash
# Wait for device to connect
adb wait-for-device

# Install APK
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Launch Main Leanback Activity
adb shell am start -n com.familywatch.referee/.MainActivity
```

---

## ☁️ Optional Amazon Bedrock Integration
See [docs/AWS_INTEGRATION.md](docs/AWS_INTEGRATION.md) for full architecture details.
To enable live Claude 3 generation:
1. Copy `config.example.js` to `app/src/main/assets/www/config.js`.
2. Add your AWS credentials and set `useBedrock: true`.
3. Re-assemble and run. If offline or credentials expire, the app silently falls back to local referee rules.

---

## 🛠️ Product Feedback & Developer Friction Log
*(Extracted from our live [FRICTION_LOG.md](FRICTION_LOG.md))*

| Category | What Happened | Resolution / Workaround | Suggestion for Amazon / Android TV |
| :--- | :--- | :--- | :--- |
| **Tooling & Setup** | Host machine only had early-access Java 26; Android Gradle Plugin (AGP) failed on unsupported class versions. | Automated isolated Temurin OpenJDK 17 bootstrap inside project environment. | Provide a Fire TV CLI quickstart container or pre-bundled dev shell for web-based Leanback apps. |
| **CLI Layout** | `cmdline-tools` package extraction omitted the required `bin/` directory nesting, breaking batch script relative paths (`%~dp0\..\lib`). | Restructured paths to `cmdline-tools/latest/bin/`. | Normalize batch scripts to detect jar files regardless of bin nesting. |
| **Remote Navigation** | Standard web focus rings are invisible on 10-foot TV viewports at 1080p distance. | Implemented custom Spatial Focus Manager with 4px gold borders, glow filters, and 1.08x transform zoom. | Document Leanback CSS design guidelines prominently in Amazon Developer portal. |
| **Cloud vs TV WebView** | WebViews running local file schemes (`file:///android_asset/`) block direct HTTPS fetch calls to AWS due to strict origin policies. | Built a native Kotlin `@JavascriptInterface` bridge with zero-dependency SigV4 HTTP client. | Offer official lightweight Fire OS JavaScript SDK bridges for AWS Bedrock. |

---

## 📄 License
This project is open-source under the **[MIT License](LICENSE)**.
Created for the Amazon Developer Hackathon (Devpost).
