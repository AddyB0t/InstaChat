package com.addybot.notifbookmark

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native module for delivering Android text share intents to React Native.
 */
class SharedIntentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    private var _instance: SharedIntentModule? = null
    private var _pendingShareUrl: String? = null
    private val _pendingShareQueue = mutableListOf<String>()

    @JvmStatic
    fun initialize(module: SharedIntentModule) {
      _instance = module
    }

    @JvmStatic
    fun getInstance(): SharedIntentModule? = _instance

    @JvmStatic
    fun setPendingShareUrl(url: String?) {
      if (url == null) {
        _pendingShareUrl = null
        _pendingShareQueue.clear()
      } else if (_pendingShareUrl == null) {
        _pendingShareUrl = url
      } else {
        _pendingShareQueue.add(url)
        if (_pendingShareQueue.size > 50) {
          _pendingShareQueue.removeAt(0)
        }
      }

      val queueDepth = _pendingShareQueue.size + if (_pendingShareUrl == null) 0 else 1
      Log.d("SharedIntentModule", "Pending share queued. queueDepth=$queueDepth")
    }

    @JvmStatic
    fun clearPendingShareUrl() {
      _pendingShareUrl = if (_pendingShareQueue.isNotEmpty()) {
        _pendingShareQueue.removeAt(0)
      } else {
        null
      }
    }
  }

  init {
    _instance = this
    Log.d("SharedIntentModule", "Initialized")
  }

  override fun getName(): String = "SharedIntentModule"

  fun hasReactContext(): Boolean {
    return reactApplicationContext.hasActiveReactInstance()
  }

  fun onShareIntentReceived(text: String) {
    Log.d("SharedIntentModule", "Share intent received")
    sendEvent("onShareIntent", text)
  }

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
        Log.w("SharedIntentModule", "React context not active for eventName=$eventName")
      }
    } catch (e: Exception) {
      Log.e("SharedIntentModule", "Error sending eventName=$eventName error=${e.message}", e)
    }
  }

  @ReactMethod
  fun checkPendingShareUrl(promise: Promise) {
    val pendingUrl = _pendingShareUrl
    if (pendingUrl != null) {
      Log.d("SharedIntentModule", "Returning pending share URL")
      clearPendingShareUrl()
      promise.resolve(pendingUrl)
    } else {
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun checkPendingShareQueue(promise: Promise) {
    val pendingUrl = _pendingShareUrl
    val urls = Arguments.createArray()

    if (pendingUrl != null) {
      urls.pushString(pendingUrl)
    }

    _pendingShareQueue.forEach { url ->
      urls.pushString(url)
    }

    _pendingShareUrl = null
    _pendingShareQueue.clear()
    promise.resolve(urls)
  }
}
