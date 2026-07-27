import Foundation
import React
import os

@objc(SharedIntentModule)
class SharedIntentModule: RCTEventEmitter {
  private let logger = Logger(subsystem: "com.notif.bookmark", category: "SharedIntentModule")
  private let appGroupId = "group.com.notif.bookmark"
  private let shareDebugEventsKey = "ShareDebugEvents"
  private let maxShareDebugEvents = 1000

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return ["onShareIntent"]
  }

  override func startObserving() {}

  override func stopObserving() {}

  @objc
  func checkPendingShareUrl(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    recordShareDebug("JS called checkPendingShareUrl pendingSingle=\(AppDelegate.pendingShareUrl != nil) pendingQueue=\(AppDelegate.pendingShareQueue.count)")

    // Check AppDelegate's pending URL
    if let pendingUrl = AppDelegate.pendingShareUrl {
      AppDelegate.pendingShareUrl = nil
      logger.info("Returning single pending URL from AppDelegate")
      recordShareDebug("Returning single pending URL from AppDelegate \(urlDebugSummary(pendingUrl))")
      resolve(pendingUrl)
      return
    }

    if !AppDelegate.pendingShareQueue.isEmpty {
      let pendingUrl = AppDelegate.pendingShareQueue.removeFirst()
      logger.info("Returning queued pending URL from AppDelegate. remaining=\(AppDelegate.pendingShareQueue.count, privacy: .public)")
      recordShareDebug("Returning queued pending URL from AppDelegate remaining=\(AppDelegate.pendingShareQueue.count) \(urlDebugSummary(pendingUrl))")
      resolve(pendingUrl)
      return
    }

    // Check UserDefaults (app group) for queued URLs
    let sharedKey = "ShareKey"
    let sharedQueueKey = "ShareQueue"

    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      logger.error("Unable to open app group UserDefaults")
      recordShareDebug("Unable to open app group UserDefaults in checkPendingShareUrl")
      resolve(nil)
      return
    }

    // First check queue
    if var queue = userDefaults.stringArray(forKey: sharedQueueKey), !queue.isEmpty {
      // Pop first URL from queue
      let url = queue.removeFirst()
      userDefaults.set(queue, forKey: sharedQueueKey)
      userDefaults.synchronize()
      logger.info("Returning pending URL from app group queue. remaining=\(queue.count, privacy: .public)")
      recordShareDebug("Returning pending URL from app group queue remaining=\(queue.count) \(urlDebugSummary(url))")
      resolve(url)
      return
    }

    // Fallback: check single URL
    if let sharedUrl = userDefaults.string(forKey: sharedKey) {
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()
      logger.info("Returning single pending URL from app group")
      recordShareDebug("Returning single pending URL from app group \(urlDebugSummary(sharedUrl))")
      resolve(sharedUrl)
      return
    }

    recordShareDebug("No pending URL available in checkPendingShareUrl")
    resolve(nil)
  }

  @objc
  func checkPendingShareQueue(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    recordShareDebug("JS called checkPendingShareQueue pendingSingle=\(AppDelegate.pendingShareUrl != nil) pendingQueue=\(AppDelegate.pendingShareQueue.count)")

    // Return all pending URLs as an array
    let sharedQueueKey = "ShareQueue"
    let sharedKey = "ShareKey"

    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      recordShareDebug("Unable to open app group UserDefaults in checkPendingShareQueue")
      resolve([])
      return
    }

    var allUrls: [String] = []

    if let pendingUrl = AppDelegate.pendingShareUrl {
      allUrls.append(pendingUrl)
      AppDelegate.pendingShareUrl = nil
      recordShareDebug("Added AppDelegate pending single URL to JS queue \(urlDebugSummary(pendingUrl))")
    }

    if !AppDelegate.pendingShareQueue.isEmpty {
      allUrls.append(contentsOf: AppDelegate.pendingShareQueue)
      recordShareDebug("Added AppDelegate pending queue to JS queue count=\(AppDelegate.pendingShareQueue.count)")
      AppDelegate.pendingShareQueue.removeAll()
    }

    // Get queue
    if let queue = userDefaults.stringArray(forKey: sharedQueueKey) {
      allUrls.append(contentsOf: queue)
      userDefaults.removeObject(forKey: sharedQueueKey)
      recordShareDebug("Added app group queue to JS queue count=\(queue.count)")
    }

    // Get single URL if exists and not in queue
    if let singleUrl = userDefaults.string(forKey: sharedKey), !allUrls.contains(singleUrl) {
      allUrls.append(singleUrl)
      userDefaults.removeObject(forKey: sharedKey)
      recordShareDebug("Added app group single URL to JS queue \(urlDebugSummary(singleUrl))")
    }

    userDefaults.synchronize()
    logger.info("Returning pending share queue to JS. count=\(allUrls.count, privacy: .public)")
    recordShareDebug("Returning pending share queue to JS count=\(allUrls.count)")
    resolve(allUrls)
  }

  @objc
  func flushNativeShareDebugEvents(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      logger.error("Unable to open app group UserDefaults for diagnostics flush")
      resolve([])
      return
    }

    let events = userDefaults.stringArray(forKey: shareDebugEventsKey) ?? []
    userDefaults.removeObject(forKey: shareDebugEventsKey)
    userDefaults.synchronize()
    logger.info("Flushing native share debug events to JS. count=\(events.count, privacy: .public)")
    resolve(events)
  }

  @objc
  func getSharedUrl(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve("URL")
  }

  private func recordShareDebug(_ message: String) {
    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      logger.error("Unable to open app group UserDefaults for diagnostics")
      return
    }

    let timestamp = ISO8601DateFormatter().string(from: Date())
    var events = userDefaults.stringArray(forKey: shareDebugEventsKey) ?? []
    events.append("\(timestamp) [SharedIntentModule] \(message)")
    if events.count > maxShareDebugEvents {
      events = Array(events.suffix(maxShareDebugEvents))
    }
    userDefaults.set(events, forKey: shareDebugEventsKey)
    userDefaults.synchronize()
  }

  private func urlDebugSummary(_ urlString: String) -> String {
    let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let components = URLComponents(string: trimmed) else {
      return "url=\(trimmed) length=\(trimmed.count) parse=failed"
    }

    let queryKeys = components.queryItems?.map { $0.name }.joined(separator: ",") ?? ""
    return "url=\(trimmed) length=\(trimmed.count) host=\(components.host ?? "") path=\(components.path) queryKeys=\(queryKeys)"
  }
}
