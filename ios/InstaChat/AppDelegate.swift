import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // Store pending shared URL
  static var pendingShareUrl: String?

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

    return true
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
        handleSharedUrl(urlParam)
        return true
      }
    }
    return false
  }

  // Check for shared URL from UserDefaults (app group)
  private func checkForSharedUrl() {
    let appGroupId = "group.com.notif.bookmark"
    let sharedKey = "ShareKey"

    if let userDefaults = UserDefaults(suiteName: appGroupId),
       let sharedUrl = userDefaults.string(forKey: sharedKey) {
      // Clear the shared URL
      userDefaults.removeObject(forKey: sharedKey)
      userDefaults.synchronize()

      handleSharedUrl(sharedUrl)
    }
  }

  private func handleSharedUrl(_ url: String) {
    // Store for React Native to retrieve
    AppDelegate.pendingShareUrl = url

    // Post notification for React Native
    NotificationCenter.default.post(
      name: NSNotification.Name("ShareIntentReceived"),
      object: nil,
      userInfo: ["url": url]
    )
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
