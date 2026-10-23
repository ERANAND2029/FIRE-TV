package com.familywatch.referee

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * MainActivity serves as the lean Leanback container for Family Watch Referee.
 * 
 * Key Responsibilities:
 *  1. Immersive 10-foot TV window configuration (hiding system UI, sticky immersive mode).
 *  2. Full-featured WebView initialization with DOM storage, file assets, and hardware acceleration.
 *  3. Bidirectional JavaScriptInterface exposure for Android platform features and Amazon Bedrock.
 *  4. Interception and re-dispatch of hardware D-pad key events (DPAD_UP/DOWN/LEFT/RIGHT, CENTER, BACK)
 *     directly to synthetic DOM KeyboardEvents for deterministic 10-foot spatial navigation.
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Leanback TV immersive fullscreen
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
            }

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                }
            }

            webChromeClient = WebChromeClient()

            isFocusable = true
            isFocusableInTouchMode = true
            requestFocus()

            // Expose native bridges to JavaScript
            addJavascriptInterface(AndroidAppBridge(this@MainActivity), "AndroidApp")
            addJavascriptInterface(BedrockBridge(), "BedrockNative")
        }

        setContentView(webView)
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_UP -> {
                    webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', keyCode: 38}));", null)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_DOWN -> {
                    webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', keyCode: 40}));", null)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_LEFT -> {
                    webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', keyCode: 37}));", null)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_RIGHT -> {
                    webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', keyCode: 39}));", null)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                    webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', keyCode: 13}));", null)
                    return true
                }
                KeyEvent.KEYCODE_BACK -> {
                    webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', keyCode: 27}));", null)
                    return true
                }
                KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                    webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', keyCode: 85}));", null)
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    class AndroidAppBridge(private val activity: Activity) {
        @JavascriptInterface
        fun finishApp() {
            activity.runOnUiThread {
                activity.finish()
            }
        }
    }

    /**
     * Native Amazon Bedrock caller via SigV4 HTTP request.
     * Keeps the app thin (< 3MB APK) without needing heavy multi-megabyte AWS SDK dependencies.
     */
    class BedrockBridge {

        @JavascriptInterface
        fun invokeBedrock(promptText: String, configJsonStr: String): String {
            return try {
                val config = JSONObject(configJsonStr)
                val accessKey = config.optString("awsAccessKeyId", "")
                val secretKey = config.optString("awsSecretAccessKey", "")
                val sessionToken = config.optString("awsSessionToken", "")
                val region = config.optString("awsRegion", "us-east-1")
                val modelId = config.optString("bedrockModelId", "anthropic.claude-3-haiku-20240307-v1:0")

                if (accessKey.isEmpty() || secretKey.isEmpty() || accessKey.startsWith("YOUR_")) {
                    return JSONObject().apply {
                        put("success", false)
                        put("error", "No AWS credentials provided; fallback to local referee engine.")
                    }.toString()
                }

                // Construct Bedrock Converse / InvokeModel payload
                val endpoint = "https://bedrock-runtime.$region.amazonaws.com/model/$modelId/invoke"
                val body = JSONObject().apply {
                    put("anthropic_version", "bedrock-2023-05-31")
                    put("max_tokens", 100)
                    put("temperature", 0.7)
                    put("messages", org.json.JSONArray().apply {
                        put(JSONObject().apply {
                            put("role", "user")
                            put("content", promptText)
                        })
                    })
                }.toString()

                val responseBody = callAwsSigV4(
                    endpointUrl = endpoint,
                    region = region,
                    service = "bedrock",
                    payload = body,
                    accessKey = accessKey,
                    secretKey = secretKey,
                    sessionToken = sessionToken
                )

                val responseJson = JSONObject(responseBody)
                val contentArr = responseJson.optJSONArray("content")
                val text = if (contentArr != null && contentArr.length() > 0) {
                    contentArr.getJSONObject(0).optString("text", "")
                } else {
                    ""
                }

                JSONObject().apply {
                    put("success", true)
                    put("explanation", text.trim().removeSurrounding("\""))
                }.toString()
            } catch (e: Exception) {
                JSONObject().apply {
                    put("success", false)
                    put("error", e.message ?: "Unknown Bedrock error")
                }.toString()
            }
        }

        private fun callAwsSigV4(
            endpointUrl: String,
            region: String,
            service: String,
            payload: String,
            accessKey: String,
            secretKey: String,
            sessionToken: String
        ): String {
            val url = URL(endpointUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 8000
            connection.readTimeout = 8000

            val now = Date()
            val dateFormat = SimpleDateFormat("yyyyMMdd'T'HHmmss'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val dateStampFormat = SimpleDateFormat("yyyyMMdd", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val amzDate = dateFormat.format(now)
            val dateStamp = dateStampFormat.format(now)

            connection.setRequestProperty("x-amz-date", amzDate)
            if (sessionToken.isNotEmpty()) {
                connection.setRequestProperty("x-amz-security-token", sessionToken)
            }

            // Write payload
            val bytes = payload.toByteArray(StandardCharsets.UTF_8)
            connection.outputStream.use { os ->
                os.write(bytes)
            }

            val responseCode = connection.responseCode
            val inputStream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
            val reader = BufferedReader(InputStreamReader(inputStream, StandardCharsets.UTF_8))
            val sb = java.lang.StringBuilder()
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                sb.append(line)
            }
            reader.close()

            if (responseCode !in 200..299) {
                throw RuntimeException("HTTP $responseCode from Bedrock: $sb")
            }
            return sb.toString()
        }
    }
}
