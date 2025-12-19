package com.instachat

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native module for handling shared intents
 * Bridges between Android Intent system and React Native
 */
class SharedIntentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    private var _instance: SharedIntentModule? = null
    private var _pendingShareUrl: String? = null

    @JvmStatic
    fun initialize(module: SharedIntentModule) {
      _instance = module
    }

    @JvmStatic
    fun getInstance(): SharedIntentModule? = _instance

    @JvmStatic
    fun setPendingShareUrl(url: String?) {
      _pendingShareUrl = url
      Log.d("SharedIntentModule", "Pending share URL set: $url")
    }

    @JvmStatic
    fun getPendingShareUrl(): String? = _pendingShareUrl

    @JvmStatic
    fun clearPendingShareUrl() {
      _pendingShareUrl = null
    }
  }

  init {
    _instance = this
    Log.d("SharedIntentModule", "Initialized")
  }

  override fun getName(): String = "SharedIntentModule"

  /**
   * Check if React context is ready
   */
  fun hasReactContext(): Boolean {
    return reactApplicationContext.hasActiveReactInstance()
  }

  /**
   * Called when a share intent is received from MainActivity
   */
  fun onShareIntentReceived(text: String) {
    Log.d("SharedIntentModule", "Share intent received: $text")

    // Send event to React Native
    sendEvent("onShareIntent", text)
  }

  /**
   * Send event to React Native
   */
  private fun sendEvent(eventName: String, data: String) {
    try {
      if (reactApplicationContext.hasActiveReactInstance()) {
        val params = Arguments.createMap()
        params.putString("url", data)

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)

        Log.d("SharedIntentModule", "Event sent to React: $eventName")
      } else {
        Log.w("SharedIntentModule", "React context not active yet")
      }
    } catch (e: Exception) {
      Log.e("SharedIntentModule", "Error sending event: ${e.message}", e)
    }
  }

  /**
   * Exported method to call from React Native if needed
   */
  @ReactMethod
  fun getSharedUrl(promise: com.facebook.react.bridge.Promise) {
    promise.resolve("URL")
  }

  /**
   * Check for pending share URL (called from React Native on app start)
   */
  @ReactMethod
  fun checkPendingShareUrl(promise: com.facebook.react.bridge.Promise) {
    val pendingUrl = _pendingShareUrl
    if (pendingUrl != null) {
      Log.d("SharedIntentModule", "Returning pending share URL: $pendingUrl")
      clearPendingShareUrl()
      promise.resolve(pendingUrl)
    } else {
      promise.resolve(null)
    }
  }
}
