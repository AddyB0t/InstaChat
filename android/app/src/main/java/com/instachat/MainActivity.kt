package com.instachat

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

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
   * Safely handle share intent - queue if React isn't ready yet
   */
  private fun handleShareIntentSafely(intent: Intent) {
    if (intent.action == Intent.ACTION_SEND && intent.type?.startsWith("text/") == true) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
      Log.d("ShareIntent", "Received share intent with text: $sharedText")

      // Try to send immediately
      val module = SharedIntentModule.getInstance()
      if (module != null && module.hasReactContext()) {
        module.onShareIntentReceived(sharedText)
      } else {
        // Store in SharedIntentModule for React Native to retrieve later
        SharedIntentModule.setPendingShareUrl(sharedText)
        Log.d("ShareIntent", "React context not ready, storing for later retrieval")
      }
    }
  }
}
