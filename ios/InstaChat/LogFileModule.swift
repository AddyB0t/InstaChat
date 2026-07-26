import Foundation
import React
import UIKit

@objc(LogFileModule)
class LogFileModule: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(shareTextFile:contents:resolver:rejecter:)
  func shareTextFile(
    _ fileName: String,
    contents: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let safeName = fileName.replacingOccurrences(
        of: "[^A-Za-z0-9._-]",
        with: "_",
        options: .regularExpression
      )
      let resolvedName = safeName.isEmpty ? "notif-debug-logs.txt" : safeName
      let documentsUrl = try FileManager.default.url(
        for: .documentDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
      )
      let logsUrl = documentsUrl.appendingPathComponent("NotiFLogs", isDirectory: true)
      try FileManager.default.createDirectory(at: logsUrl, withIntermediateDirectories: true)
      let fileUrl = logsUrl.appendingPathComponent(resolvedName)
      try contents.write(to: fileUrl, atomically: true, encoding: .utf8)

      DispatchQueue.main.async {
        guard let presenter = Self.topViewController() else {
          reject("LOG_EXPORT_FAILED", "Unable to find a view controller for sharing logs", nil)
          return
        }

        let activityViewController = UIActivityViewController(
          activityItems: [fileUrl],
          applicationActivities: nil
        )
        if let popover = activityViewController.popoverPresentationController {
          popover.sourceView = presenter.view
          popover.sourceRect = CGRect(
            x: presenter.view.bounds.midX,
            y: presenter.view.bounds.midY,
            width: 0,
            height: 0
          )
          popover.permittedArrowDirections = []
        }
        presenter.present(activityViewController, animated: true)
        resolve(fileUrl.path)
      }
    } catch {
      reject("LOG_EXPORT_FAILED", "Failed to export NotiF debug logs", error)
    }
  }

  private static func topViewController(
    from rootViewController: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }?
      .rootViewController
  ) -> UIViewController? {
    if let navigationController = rootViewController as? UINavigationController {
      return topViewController(from: navigationController.visibleViewController)
    }

    if let tabBarController = rootViewController as? UITabBarController {
      return topViewController(from: tabBarController.selectedViewController)
    }

    if let presented = rootViewController?.presentedViewController {
      return topViewController(from: presented)
    }

    return rootViewController
  }
}
