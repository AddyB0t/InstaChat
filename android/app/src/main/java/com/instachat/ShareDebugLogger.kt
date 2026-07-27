package com.instachat

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import org.json.JSONArray

object ShareDebugLogger {
  private const val TAG = "ShareDebug"
  private const val PREFS_NAME = "notif_share_debug"
  private const val EVENTS_KEY = "events"
  private const val MAX_EVENTS = 1000

  @Synchronized
  fun record(context: Context?, source: String, message: String) {
    if (context == null) {
      Log.d(TAG, "[$source] $message")
      return
    }

    try {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val existing = JSONArray(prefs.getString(EVENTS_KEY, "[]") ?: "[]")
      val events = mutableListOf<String>()

      for (index in 0 until existing.length()) {
        events.add(existing.optString(index))
      }

      events.add("${timestamp()} [$source] $message")
      val trimmed = events.takeLast(MAX_EVENTS)
      val serialized = JSONArray()
      trimmed.forEach { serialized.put(it) }

      prefs.edit().putString(EVENTS_KEY, serialized.toString()).apply()
    } catch (error: Exception) {
      Log.w(TAG, "Failed to record native share debug event", error)
    }

    Log.d(TAG, "[$source] $message")
  }

  @Synchronized
  fun flush(context: Context): WritableArray {
    val output = Arguments.createArray()

    try {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val existing = JSONArray(prefs.getString(EVENTS_KEY, "[]") ?: "[]")

      for (index in 0 until existing.length()) {
        output.pushString(existing.optString(index))
      }

      prefs.edit().remove(EVENTS_KEY).apply()
    } catch (error: Exception) {
      Log.w(TAG, "Failed to flush native share debug events", error)
    }

    return output
  }

  fun describeText(text: String): String =
    "length=${text.length} preview=${text.take(180)}"

  fun describeUrl(url: String): String {
    val trimmed = url.trim()
    val uri = runCatching { android.net.Uri.parse(trimmed) }.getOrNull()
    val queryKeys = uri?.queryParameterNames?.joinToString(",").orEmpty()

    return "url=$trimmed length=${trimmed.length} host=${uri?.host.orEmpty()} path=${uri?.path.orEmpty()} queryKeys=$queryKeys"
  }

  private fun timestamp(): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone("UTC")
    return formatter.format(Date())
  }
}
