package com.instachat

import android.content.Intent
import android.net.Uri
import android.os.Environment
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class LogFileModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "LogFileModule"

  @ReactMethod
  fun shareTextFile(fileName: String, contents: String, promise: Promise) {
    try {
      val safeName = fileName.replace(Regex("[^A-Za-z0-9._-]"), "_").ifBlank { "notif-debug-logs.txt" }
      val baseDir = reactContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
        ?: reactContext.filesDir
      val logsDir = File(baseDir, "NotiFLogs")
      if (!logsDir.exists()) {
        logsDir.mkdirs()
      }

      val logFile = File(logsDir, safeName)
      logFile.writeText(contents, Charsets.UTF_8)

      val uri: Uri = FileProvider.getUriForFile(
        reactContext,
        "${reactContext.packageName}.fileprovider",
        logFile
      )

      val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, "NotiF Debug Logs")
        putExtra(Intent.EXTRA_TEXT, "NotiF debug logs attached.")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      reactContext.packageManager.queryIntentActivities(sendIntent, 0).forEach { resolveInfo ->
        reactContext.grantUriPermission(
          resolveInfo.activityInfo.packageName,
          uri,
          Intent.FLAG_GRANT_READ_URI_PERMISSION
        )
      }

      val chooser = Intent.createChooser(sendIntent, "Share NotiF Debug Logs").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(chooser)
      promise.resolve(logFile.absolutePath)
    } catch (error: Exception) {
      promise.reject("LOG_EXPORT_FAILED", "Failed to export NotiF debug logs", error)
    }
  }
}
