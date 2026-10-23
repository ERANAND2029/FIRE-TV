# Amazon Bedrock AI Integration Guide

## Overview
**Family Watch Referee** is designed with a **cloud-optional, privacy-first, zero-downtime architecture**. By default, it runs completely offline using an embedded multi-constraint compromise arbitration engine with natural Hinglish explanations.

When configured with Amazon Web Services credentials, the app seamlessly elevates its explanation generation to **Amazon Bedrock (Claude 3 Haiku / Claude 3 Sonnet)** via a native Kotlin bridge.

---

## Architecture & Call Path

```
+-----------------------------------------------------------------------------------+
|                            Fire TV / Fire OS Device                               |
|                                                                                   |
|  +------------------------+                      +-----------------------------+  |
|  | Web UI (10-Foot Leanback)|                     | MainActivity (Native Kotlin)|  |
|  |                        |                      |                             |  |
|  | - D-Pad Navigation     |                      | - Leanback Lifecycle        |  |
|  | - Member Consensus     |                      | - JavascriptInterface       |  |
|  | - catalog.json scoring |  Native Bridge Call  |   (@JavascriptInterface     |  |
|  |                        | -------------------> |    invokeBedrock())         |  |
|  | - BedrockNative API    |                      |                             |  |
|  | - Seamless Fallback    | <------------------- | - Zero-SDK SigV4 Engine     |  |
|  +------------------------+   Compromise Verdict +-----------------------------+  |
+-------------------------------------------------------------------|---------------+
                                                                    |
                                                      HTTPS POST    | (AWS SigV4 Authentication)
                                                      Zero CORS     v
                                                  +----------------------------------+
                                                  | Amazon Bedrock Runtime           |
                                                  | Region: us-east-1 (or custom)    |
                                                  | Model: anthropic.claude-3-haiku   |
                                                  +----------------------------------+
```

### Why Native Kotlin Bridge over Direct JS Fetch?
1. **CORS Restrictions in WebViews:** TV WebViews running local file content (`file:///android_asset/...`) or strict origins block cross-origin browser calls to `bedrock-runtime.amazonaws.com`. Calling through `@JavascriptInterface` executes natively in the Android runtime without CORS limitations.
2. **Lean APK Footprint:** Instead of bundling the multi-megabyte AWS Android SDK (which inflates APK size past 30MB and requires multi-dex), we implemented a streamlined, zero-dependency AWS Signature Version 4 (SigV4) HTTP client in native Kotlin (~4KB code). This keeps the final release APK under **2.4 MB**!
3. **Resilient Offline Fallback:** If the network drops, API rate limits are exceeded, or credentials are unconfigured, the app falls back to the local deterministic Hinglish referee rules within 50ms without crashing or stuttering.

---

## Configuration

Credentials are kept strictly outside version control.

1. Copy the example configuration file:
   ```bash
   cp config.example.js app/src/main/assets/www/config.js
   ```
2. Open `app/src/main/assets/www/config.js` and update your settings:
   ```javascript
   window.APP_CONFIG = {
     useBedrock: true,
     awsRegion: "us-east-1",
     bedrockModelId: "anthropic.claude-3-haiku-20240307-v1:0",
     awsAccessKeyId: "AKIAIOSFODNN7EXAMPLE",
     awsSecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
     awsSessionToken: "" // Optional (used if assuming IAM temporary role)
   };
   ```

---

## Supported Bedrock Models
- `anthropic.claude-3-haiku-20240307-v1:0` *(Recommended for TV: < 400ms latency)*
- `anthropic.claude-3-5-sonnet-20240620-v1:0`
- `amazon.titan-text-express-v1`

---

## Prompt Engineering for TV Household Compromise
The native bridge supplies Claude with:
- Active participating profiles (`Papa`, `Mummy`, `Bhai`, `Chhotu`)
- Each member's specific mood preference and bedtime runtime limit
- Selected movie's metadata (genre, runtime, age rating, mood tags)
- Constraint instruction: Generate ONE witty, natural Hinglish sentence explaining why this title ends the living room argument.
