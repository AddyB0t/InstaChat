import Foundation
import React
import os

@objc(SharedIntentModule)
class SharedIntentModule: RCTEventEmitter {
  private let logger = Logger(subsystem: "com.notif.bookmark", category: "SharedIntentModule")
  private let appGroupId = "group.com.notif.bookmark"

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
    if let pendingUrl = AppDelegate.pendingShareUrl {
      AppDelegate.pendingShareUrl = nil
      logger.info("Returning single pending URL from AppDelegate")
      resolve(pendingUrl)
      return
    }

    if !AppDelegate.pendingShareQueue.isEmpty {
      let pendingUrl = AppDelegate.pendingShareQueue.removeFirst()
      logger.info("Returning queued pending URL from AppDelegate. remaining=\(AppDelegate.pendingShareQueue.count, privacy: .public)")
      resolve(pendingUrl)
      return
    }

    let sharedKey = "ShareKey"
    let sharedQueueKey = "ShareQueue"

    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      logger.error("Unable to open app group UserDefaults")
      resolve(nil)
      return
    }

    if var queue = userDefaults.stringArray(forKey: sharedQueueKey), !queue.isEmpty {
      let url = queue.removeFirst()
      userDefaults.set(queue, forKey: sharedQueueKey)
      userDefaults.synchronize()
      logger.info("Returning pending URL from app group queue. remaining=\(queue.count, privacy: .public)")
      resolve(url)
      return
    }

    if let sharedUrl = userDefaults.string(forKey: sharedKey) {
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()
      logger.info("Returning single pending URL from app group")
      resolve(sharedUrl)
      return
    }

    resolve(nil)
  }

  @objc
  func checkPendingShareQueue(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let sharedQueueKey = "ShareQueue"
    let sharedKey = "ShareKey"

    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      logger.error("Unable to open app group UserDefaults")
      resolve([])
      return
    }

    var allUrls: [String] = []

    if let pendingUrl = AppDelegate.pendingShareUrl {
      allUrls.append(pendingUrl)
      AppDelegate.pendingShareUrl = nil
    }

    if !AppDelegate.pendingShareQueue.isEmpty {
      allUrls.append(contentsOf: AppDelegate.pendingShareQueue)
      AppDelegate.pendingShareQueue.removeAll()
    }

    if let queue = userDefaults.stringArray(forKey: sharedQueueKey) {
      allUrls.append(contentsOf: queue)
      userDefaults.removeObject(forKey: sharedQueueKey)
    }

    if let singleUrl = userDefaults.string(forKey: sharedKey), !allUrls.contains(singleUrl) {
      allUrls.append(singleUrl)
      userDefaults.removeObject(forKey: sharedKey)
    }

    userDefaults.synchronize()
    logger.info("Returning pending share queue to JS. count=\(allUrls.count, privacy: .public)")
    resolve(allUrls)
  }
}
