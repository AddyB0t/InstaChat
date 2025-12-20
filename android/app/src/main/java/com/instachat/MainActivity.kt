package com.instachat

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.util.regex.Pattern

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "InstaChat"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Handle share intents when app is first launched
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Store the initial intent (will be processed when React is ready)
    handleShareIntentSafely(intent)
  }

  /**
   * Handle share intents when app is already running
   */
  override fun onNewIntent(intent: Intent?) {
    // Don't call super if React isn't ready yet - it will cause errors
    val module = SharedIntentModule.getInstance()
    if (module != null && module.hasReactContext()) {
      super.onNewIntent(intent)
    }

    intent?.let {
      setIntent(intent)
      handleShareIntentSafely(intent)
    }
  }

  /**
   * Extract URL from shared text (handles Reddit, Facebook, etc.)
   */
  private fun extractUrlFromText(text: String): String {
    // URL pattern to match http/https URLs
    val urlPattern = Pattern.compile(
      "(https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+)",
      Pattern.CASE_INSENSITIVE
    )
    val matcher = urlPattern.matcher(text)

    // Return first URL found, or original text if no URL found
    return if (matcher.find()) {
      val url = matcher.group(1) ?: text
      Log.d("ShareIntent", "Extracted URL: $url from text: $text")
      url
    } else {
      // No URL found, return original text (might be a plain URL)
      text.trim()
    }
  }

  /**
   * Safely handle share intent - queue if React isn't ready yet
   */
  private fun handleShareIntentSafely(intent: Intent) {
    if (intent.action == Intent.ACTION_SEND && intent.type?.startsWith("text/") == true) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
      Log.d("ShareIntent", "Received share intent with text: $sharedText")

      // Extract URL from shared text (handles apps like Reddit/Facebook that include extra text)
      val extractedUrl = extractUrlFromText(sharedText)
      Log.d("ShareIntent", "Extracted URL to process: $extractedUrl")

      // Try to send immediately
      val module = SharedIntentModule.getInstance()
      if (module != null && module.hasReactContext()) {
        module.onShareIntentReceived(extractedUrl)
      } else {
        // Store in SharedIntentModule for React Native to retrieve later
        SharedIntentModule.setPendingShareUrl(extractedUrl)
        Log.d("ShareIntent", "React context not ready, storing for later retrieval")
      }
    }
  }
}
