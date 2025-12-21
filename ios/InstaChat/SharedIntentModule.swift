import Foundation
import React

@objc(SharedIntentModule)
class SharedIntentModule: RCTEventEmitter {

  private var hasListeners = false

  override init() {
    super.init()
    // Listen for share intent notifications
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleShareIntent(_:)),
      name: NSNotification.Name("ShareIntentReceived"),
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return ["onShareIntent"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc
  func handleShareIntent(_ notification: Notification) {
    if let url = notification.userInfo?["url"] as? String {
      if hasListeners {
        sendEvent(withName: "onShareIntent", body: ["url": url])
      }
    }
  }

  @objc
  func checkPendingShareUrl(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    // Check AppDelegate's pending URL
    if let pendingUrl = AppDelegate.pendingShareUrl {
      AppDelegate.pendingShareUrl = nil
      resolve(pendingUrl)
      return
    }

    // Check UserDefaults (app group) for queued URLs
    let appGroupId = "group.com.notif.bookmark"
    let sharedKey = "ShareKey"
    let sharedQueueKey = "ShareQueue"

    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      resolve(nil)
      return
    }

    // First check queue
    if var queue = userDefaults.stringArray(forKey: sharedQueueKey), !queue.isEmpty {
      // Pop first URL from queue
      let url = queue.removeFirst()
      userDefaults.set(queue, forKey: sharedQueueKey)
      userDefaults.synchronize()
      resolve(url)
      return
    }

    // Fallback: check single URL
    if let sharedUrl = userDefaults.string(forKey: sharedKey) {
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()
      resolve(sharedUrl)
      return
    }

    resolve(nil)
  }

  @objc
  func checkPendingShareQueue(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    // Return all pending URLs as an array
    let appGroupId = "group.com.notif.bookmark"
    let sharedQueueKey = "ShareQueue"
    let sharedKey = "ShareKey"

    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      resolve([])
      return
    }

    var allUrls: [String] = []

    // Get queue
    if let queue = userDefaults.stringArray(forKey: sharedQueueKey) {
      allUrls.append(contentsOf: queue)
      userDefaults.removeObject(forKey: sharedQueueKey)
    }

    // Get single URL if exists and not in queue
    if let singleUrl = userDefaults.string(forKey: sharedKey), !allUrls.contains(singleUrl) {
      allUrls.append(singleUrl)
      userDefaults.removeObject(forKey: sharedKey)
    }

    userDefaults.synchronize()
    resolve(allUrls)
  }

  @objc
  func getSharedUrl(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve("URL")
  }
}
