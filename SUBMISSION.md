# Devpost Hackathon Submission: Family Watch Referee 📺⚖️

**Track:** Fire TV Track  
**Project Name:** Family Watch Referee  
**Short Tagline:** The AI Household Compromise Engine for Fire TV that ends the nightly "Aaj kya dekhein?" living room argument in under 10 seconds.

---

## 💡 Inspiration
In millions of Indian households, turning on the TV every evening doesn't bring relaxation—it starts a debate. 
- Papa has an early morning meeting, so he refuses anything over 90 minutes and wants a grounded thriller.
- Mummy wants lighthearted family comedy or emotional drama.
- Bhai wants high-energy sci-fi or action.
- Little Chhotu cannot watch anything with violence or mature themes—requiring strict **U** age ratings.

The family spends 25 to 45 minutes scrolling past infinite rows on streaming services, getting frustrated until someone gives up and leaves the room. We asked ourselves: *Why can't the TV act as an impartial, witty referee that listens to everyone on the sofa, factors in every constraint, and picks the one compromise title that makes everyone happy?* 

That was the spark for **Family Watch Referee**.

---

## 🚀 What It Does
**Family Watch Referee** is a native Leanback TV app tailored specifically for the 10-foot Fire TV living room experience:
1. **D-Pad First Profile Cards:** Displays the 4 household members (**Papa**, **Mummy**, **Bhai**, **Chhotu**). Anyone on the sofa can toggle their participation (`Watching` vs `Skipping`) with a single press of the remote **OK** button.
2. **Individual Remote Preferences:** Members can quickly select their mood (**Action**, **Comedy**, **Family**, **Thriller**, **Chill**) and max runtime tolerance (**60m**, **90m**, **120m**) using only the remote arrows.
3. **Hard Kid-Safety Guarantee:** Whenever **Chhotu** is watching, the AI Referee locks down the catalog, pruning all non-`U` rated titles immediately.
4. **Multi-Constraint Compromise Engine:** Evaluates our rich 25-title fictional catalog, calculating mood consensus, steep bedtime penalties for titles that run over anyone's limit, and unanimity bonuses.
5. **Witty Hinglish AI Verdict:** Explains the decision in a friendly, humorous Hinglish sentence (*"Chhotu ke liye safe U-rating, Papa ko mast story, aur 92 min mein bedtime sorted!"*). Works completely offline with zero network, or elevates to **Amazon Bedrock (Claude 3)** via a native Kotlin bridge when configured with AWS credentials.
6. **Result Screen & Simulated Player:** Displays a high-contrast poster card, title, runtime, age badge, match percentage, and allows one-click **"Play Now"** (launching a full simulated TV video player) or **"Decide Again"** (instantly presenting the next best alternative).
7. **Adaptive Household Memory:** Remembers past picks in local storage, applies a repeat penalty to prevent boring duplicates, and adapts dynamically to weekend vs. weekday prime times.

---

## 🛠️ How We Built It
- **Leanback Native Shell (Kotlin):** Built a lightweight (~2.3 MB APK), ultra-fast native Android TV / Fire TV container with `LEANBACK_LAUNCHER` intent filters, full hardware acceleration, immersive fullscreen sticky flags, and custom Leanback banner drawables.
- **10-Foot Leanback Web Engine:** Built with clean HTML5, modern CSS3, and vanilla JavaScript without heavy frontend frameworks or build steps.
- **Spatial Focus Manager:** Custom D-pad navigation engine that dynamically tracks geometric bounding boxes to handle 4-way arrow keys, D-pad Center (Enter), and Android Back keys seamlessly.
- **Synthesized Web Audio Chimes:** Built an in-memory Web Audio oscillator engine that provides satisfying remote feedback tones without needing external MP3 audio assets.
- **Amazon Bedrock Native Bridge:** Rather than pulling in 30MB+ of AWS Android SDK jars, we engineered a native Kotlin Signature Version 4 (SigV4) HTTP client exposed to JavaScript via `@JavascriptInterface`, cleanly bypassing WebView CORS restrictions while maintaining instant offline fallback.

---

## 🚧 Challenges We Ran Into
1. **Living Room 10-Foot UI Contrast:** Designing for a TV screen viewed from 10 feet away is fundamentally different from mobile or desktop. Standard web focus rings and small fonts are unreadable. We designed a high-contrast dark theme with a minimum font size of 28px, 4px vibrant gold focus rings, and 1.08x CSS scale zooms.
2. **CORS Restrictions in TV WebViews:** Local assets loaded over `file:///android_asset/` cannot make standard browser `fetch` requests to AWS Bedrock due to strict cross-origin security. We solved this by routing the request natively through Kotlin's Android runtime via `@JavascriptInterface`.
3. **Clean Zero-Bloat Packaging:** To ensure the app installs in seconds even on entry-level Fire TV Sticks with limited storage, we avoided heavy runtime dependencies, keeping the entire compiled application under 2.4 MB.

---

## 🏆 Accomplishments That We're Proud Of
- A **production-grade 10-foot TV experience** that operates 100% with the standard D-pad remote (no mouse or touch required).
- Zero third-party trademarks, copyrighted posters, or proprietary audio assets—100% original fictional catalog and procedural vector assets.
- The **Chhotu Kid-Safety Lock** provides an uncompromising peace of mind for families.
- Seamless dual-mode AI architecture: intelligent local rule-based referee engine for offline reliability + optional Amazon Bedrock Claude 3 integration for real-time generative verdicts.

---

## 📚 What We Learned
- How to architect spatial keyboard navigation algorithms for Android TV remotes.
- The power of combining lightweight native Android wrappers with web-based Leanback frontends for rapid deployment across Fire OS and Android TV devices.
- Practical prompt engineering for multi-party household consensus in conversational Hinglish.

---

## 🔮 What's Next for Family Watch Referee
- **Direct Alexa Voice Skills Integration:** Direct Alexa voice triggers (*"Alexa, ask Watch Referee to decide tonight's movie"*).
- **Deep-linking to Streaming Apps:** Direct Intent launching into Prime Video, Netflix, and Disney+ Hotstar based on the winning title.
- **Facial Presence Detection:** Using TV camera accessories to automatically detect who is sitting on the couch and pre-select active profiles.

---

## 🏷️ Built With
- `Fire OS`
- `Android TV (API 30+)`
- `Kotlin`
- `Android Leanback`
- `WebView`
- `HTML5 / CSS3`
- `Vanilla JavaScript`
- `Web Audio API`
- `Amazon Bedrock (Claude 3)`
- `AWS SigV4`
- `Gradle`
