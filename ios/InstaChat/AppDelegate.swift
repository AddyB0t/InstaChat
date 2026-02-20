import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // Store pending shared URLs (queue)
  static var pendingShareUrl: String?
  static var pendingShareQueue: [String] = []

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
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
    checkForSharedUrl()

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
    // Check for shared URL when app comes to foreground
    checkForSharedUrl()
  }

  // Handle URL scheme (notif://share?url=...)
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if url.scheme == "notif" && url.host == "share" {
      if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
         let queryItems = components.queryItems,
         let urlParam = queryItems.first(where: { $0.name == "url" })?.value {

        // Clear UserDefaults to prevent duplicate processing from checkForSharedUrl()
        let appGroupId = "group.com.notif.bookmark"
        if let userDefaults = UserDefaults(suiteName: appGroupId) {
          userDefaults.removeObject(forKey: "ShareKey")
          userDefaults.removeObject(forKey: "ShareQueue")
          userDefaults.synchronize()
        }

        handleSharedUrl(urlParam)
      }

      // Forward to React Native's Linking module (primary path)
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
  private func checkForSharedUrl() {
    let appGroupId = "group.com.notif.bookmark"
    let sharedKey = "ShareKey"
    let sharedQueueKey = "ShareQueue"

    guard let userDefaults = UserDefaults(suiteName: appGroupId) else { return }

    // First, check for queued URLs (multiple shares)
    if let queue = userDefaults.stringArray(forKey: sharedQueueKey), !queue.isEmpty {
      // Clear the queue
      userDefaults.removeObject(forKey: sharedQueueKey)
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()

      // Process all URLs in queue
      for url in queue {
        handleSharedUrl(url)
      }
      return
    }

    // Fallback: check single URL for backward compatibility
    if let sharedUrl = userDefaults.string(forKey: sharedKey) {
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()
      handleSharedUrl(sharedUrl)
    }
  }

  private func handleSharedUrl(_ url: String) {
    // Store for React Native to retrieve via polling fallback
    AppDelegate.pendingShareUrl = url
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
