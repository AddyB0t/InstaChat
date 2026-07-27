package com.instachat

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
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
      _instance?.reactApplicationContext?.let {
        ShareDebugLogger.record(it, "SharedIntentModule", "Pending share URL set ${url?.let(ShareDebugLogger::describeUrl) ?: "null"}")
      }
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
    ShareDebugLogger.record(reactContext, "SharedIntentModule", "Initialized")
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
    ShareDebugLogger.record(
      reactApplicationContext,
      "SharedIntentModule",
      "Share intent received from MainActivity ${ShareDebugLogger.describeUrl(text)}"
    )

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
        ShareDebugLogger.record(
          reactApplicationContext,
          "SharedIntentModule",
          "Event sent to React eventName=$eventName ${ShareDebugLogger.describeUrl(data)}"
        )
      } else {
        Log.w("SharedIntentModule", "React context not active yet")
        ShareDebugLogger.record(reactApplicationContext, "SharedIntentModule", "React context not active for eventName=$eventName")
      }
    } catch (e: Exception) {
      Log.e("SharedIntentModule", "Error sending event: ${e.message}", e)
      ShareDebugLogger.record(reactApplicationContext, "SharedIntentModule", "Error sending event eventName=$eventName error=${e.message}")
    }
  }

  /**
   * Exported method to call from React Native if needed
   */
  @ReactMethod
  fun getSharedUrl(promise: Promise) {
    promise.resolve("URL")
  }

  /**
   * Check for pending share URL (called from React Native on app start)
   */
  @ReactMethod
  fun checkPendingShareUrl(promise: Promise) {
    ShareDebugLogger.record(
      reactApplicationContext,
      "SharedIntentModule",
      "JS called checkPendingShareUrl hasPending=${_pendingShareUrl != null}"
    )
    val pendingUrl = _pendingShareUrl
    if (pendingUrl != null) {
      Log.d("SharedIntentModule", "Returning pending share URL: $pendingUrl")
      ShareDebugLogger.record(
        reactApplicationContext,
        "SharedIntentModule",
        "Returning pending share URL ${ShareDebugLogger.describeUrl(pendingUrl)}"
      )
      clearPendingShareUrl()
      promise.resolve(pendingUrl)
    } else {
      ShareDebugLogger.record(reactApplicationContext, "SharedIntentModule", "No pending share URL")
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun checkPendingShareQueue(promise: Promise) {
    ShareDebugLogger.record(
      reactApplicationContext,
      "SharedIntentModule",
      "JS called checkPendingShareQueue hasPending=${_pendingShareUrl != null}"
    )

    val pendingUrl = _pendingShareUrl
    if (pendingUrl != null) {
      clearPendingShareUrl()
      val urls = Arguments.createArray()
      urls.pushString(pendingUrl)
      ShareDebugLogger.record(
        reactApplicationContext,
        "SharedIntentModule",
        "Returning Android pending share queue count=1 ${ShareDebugLogger.describeUrl(pendingUrl)}"
      )
      promise.resolve(urls)
    } else {
      ShareDebugLogger.record(reactApplicationContext, "SharedIntentModule", "Returning Android pending share queue count=0")
      promise.resolve(Arguments.createArray())
    }
  }

  @ReactMethod
  fun flushNativeShareDebugEvents(promise: Promise) {
    promise.resolve(ShareDebugLogger.flush(reactApplicationContext))
  }
}
