import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {

    let appGroupId = "group.com.notif.bookmark"
    let sharedKey = "ShareKey"

    override func isContentValid() -> Bool {
        return true
    }

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        if let content = extensionContext?.inputItems.first as? NSExtensionItem {
            if let attachments = content.attachments {
                for attachment in attachments {
                    if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                        attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (data, error) in
                            if let url = data as? URL {
                                self?.saveAndOpen(url: url.absoluteString)
                            }
                        }
                    } else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                        attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (data, error) in
                            if let text = data as? String {
                                self?.saveAndOpen(url: text)
                            }
                        }
                    }
                }
            }
        }
    }

    private func saveAndOpen(url: String) {
        let userDefaults = UserDefaults(suiteName: appGroupId)
        userDefaults?.set(url, forKey: sharedKey)
        userDefaults?.synchronize()

        // Open main app
        let urlString = "notif://share?url=\(url.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? url)"
        if let url = URL(string: urlString) {
            openURL(url)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }

    @objc func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.perform(#selector(openURL(_:)), with: url)
                return
            }
            responder = responder?.next
        }

        // Alternative method for iOS 13+
        let selector = sel_registerName("openURL:")
        var responderChain: UIResponder? = self
        while responderChain != nil {
            if responderChain!.responds(to: selector) {
                responderChain!.perform(selector, with: url)
                return
            }
            responderChain = responderChain?.next
        }
    }

    override func didSelectPost() {
        self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }

    override func configurationItems() -> [Any]! {
        return []
    }
}
