import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import os

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // Store pending shared URLs (queue)
  static var pendingShareUrl: String?
  static var pendingShareQueue: [String] = []
  private let logger = Logger(subsystem: "com.notif.bookmark", category: "AppDelegate")
  private let appGroupId = "group.com.notif.bookmark"
  private let shareDebugEventsKey = "ShareDebugEvents"
  private let maxShareDebugEvents = 1000

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    logger.info("didFinishLaunchingWithOptions")
    let launchOptionKeys = launchOptions?.keys.map { $0.rawValue }.joined(separator: ",") ?? ""
    recordShareDebug("didFinishLaunchingWithOptions launchOptionsKeys=\(launchOptionKeys)")

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "InstaChat",
      in: window,
      launchOptions: launchOptions
    )

    // Check for shared URL from app group (cold start)
    _ = checkForSharedUrl()

    // Listen for app becoming active
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(applicationDidBecomeActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )

    return true
  }

  @objc func applicationDidBecomeActive() {
    logger.info("applicationDidBecomeActive")
    recordShareDebug("applicationDidBecomeActive pendingSingle=\(AppDelegate.pendingShareUrl != nil) pendingQueue=\(AppDelegate.pendingShareQueue.count)")
    // Check for shared URL when app comes to foreground
    _ = checkForSharedUrl()
  }

  // Handle URL scheme (notif://share?url=...)
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    logger.info("openURL received: \(url.absoluteString, privacy: .private)")
    recordShareDebug("openURL received \(urlDebugSummary(url.absoluteString))")

    if url.scheme == "notif" && url.host == "share" {
      let queuedFromAppGroup = checkForSharedUrl()
      let alreadyQueuedShare = AppDelegate.pendingShareUrl != nil || !AppDelegate.pendingShareQueue.isEmpty
      recordShareDebug("openURL share signal queuedFromAppGroup=\(queuedFromAppGroup) alreadyQueuedShare=\(alreadyQueuedShare)")

      if !queuedFromAppGroup,
         !alreadyQueuedShare,
         let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
         let queryItems = components.queryItems,
         let urlParam = queryItems.first(where: { $0.name == "url" })?.value {
        recordShareDebug("openURL using embedded url parameter \(urlDebugSummary(urlParam))")
        handleSharedUrl(urlParam)
      } else {
        recordShareDebug("openURL did not use embedded url parameter")
      }

      // Forward to React Native's Linking module (primary path)
      recordShareDebug("Posting RCTOpenURLNotification to React Native")
      NotificationCenter.default.post(
        name: NSNotification.Name("RCTOpenURLNotification"),
        object: nil,
        userInfo: ["url": url.absoluteString]
      )
      return true
    }
    return false
  }

  // Check for shared URL from UserDefaults (app group)
  private func checkForSharedUrl() -> Bool {
    logger.debug("Checking app group for pending share URLs")
    recordShareDebug("Checking app group for pending share URLs")

    let sharedKey = "ShareKey"
    let sharedQueueKey = "ShareQueue"

    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      logger.error("Unable to open app group UserDefaults")
      recordShareDebug("Unable to open app group UserDefaults")
      return false
    }

    // First, check for queued URLs (multiple shares)
    if let queue = userDefaults.stringArray(forKey: sharedQueueKey), !queue.isEmpty {
      logger.info("Found queued share URLs: \(queue.count, privacy: .public)")
      recordShareDebug("Found queued share URLs count=\(queue.count)")
      // Clear the queue
      userDefaults.removeObject(forKey: sharedQueueKey)
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()

      // Process all URLs in queue
      for url in queue {
        recordShareDebug("Queue URL moved to JS bridge \(urlDebugSummary(url))")
        handleSharedUrl(url)
      }
      return true
    }

    // Fallback: check single URL for backward compatibility
    if let sharedUrl = userDefaults.string(forKey: sharedKey) {
      logger.info("Found single pending share URL")
      recordShareDebug("Found single pending share URL \(urlDebugSummary(sharedUrl))")
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()
      handleSharedUrl(sharedUrl)
      return true
    }

    recordShareDebug("No pending share URL in app group")
    return false
  }

  private func handleSharedUrl(_ url: String) {
    // Store for React Native to retrieve via polling fallback.
    if AppDelegate.pendingShareUrl == nil {
      AppDelegate.pendingShareUrl = url
    } else {
      AppDelegate.pendingShareQueue.append(url)
    }

    let queueDepth = AppDelegate.pendingShareQueue.count + (AppDelegate.pendingShareUrl == nil ? 0 : 1)
    logger.info("Queued shared URL for JS bridge. queueDepth=\(queueDepth, privacy: .public)")
    recordShareDebug("Queued shared URL for JS bridge queueDepth=\(queueDepth) \(urlDebugSummary(url))")
  }

  private func recordShareDebug(_ message: String) {
    guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
      logger.error("Unable to open app group UserDefaults for diagnostics")
      return
    }

    let timestamp = ISO8601DateFormatter().string(from: Date())
    var events = userDefaults.stringArray(forKey: shareDebugEventsKey) ?? []
    events.append("\(timestamp) [AppDelegate] \(message)")
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

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
