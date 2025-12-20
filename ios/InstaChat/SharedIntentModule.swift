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

    // Also check UserDefaults (app group) as fallback
    let appGroupId = "group.com.notif.bookmark"
    let sharedKey = "ShareKey"

    if let userDefaults = UserDefaults(suiteName: appGroupId),
       let sharedUrl = userDefaults.string(forKey: sharedKey) {
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()
      resolve(sharedUrl)
      return
    }

    resolve(nil)
  }

  @objc
  func getSharedUrl(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve("URL")
  }
}
