import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    let appGroupId = "group.com.notif.bookmark"
    let sharedKey = "ShareKey"
    let sharedQueueKey = "ShareQueue" // Array of URLs for queuing multiple shares

    // UI Elements
    private let containerView = UIView()
    private let iconView = UIView()
    private let bookmarkShape = UIView()
    private let statusLabel = UILabel()
    private let checkmarkView = UIImageView()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractAndSaveURL()
    }

    private func setupUI() {
        // Semi-transparent background
        view.backgroundColor = UIColor.black.withAlphaComponent(0.5)

        // Container card
        containerView.backgroundColor = UIColor(red: 26/255, green: 26/255, blue: 26/255, alpha: 1)
        containerView.layer.cornerRadius = 20
        containerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(containerView)

        // App icon container
        iconView.backgroundColor = UIColor(red: 26/255, green: 26/255, blue: 26/255, alpha: 1)
        iconView.layer.cornerRadius = 16
        iconView.layer.borderWidth = 1
        iconView.layer.borderColor = UIColor.white.withAlphaComponent(0.1).cgColor
        iconView.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(iconView)

        // Orange bookmark shape
        bookmarkShape.backgroundColor = UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1)
        bookmarkShape.layer.cornerRadius = 4
        bookmarkShape.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        bookmarkShape.translatesAutoresizingMaskIntoConstraints = false
        iconView.addSubview(bookmarkShape)

        // Status label
        statusLabel.text = "Saving..."
        statusLabel.textColor = .white
        statusLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(statusLabel)

        // Checkmark (hidden initially)
        checkmarkView.image = UIImage(systemName: "checkmark.circle.fill")
        checkmarkView.tintColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
        checkmarkView.translatesAutoresizingMaskIntoConstraints = false
        checkmarkView.alpha = 0
        containerView.addSubview(checkmarkView)

        NSLayoutConstraint.activate([
            // Container
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.widthAnchor.constraint(equalToConstant: 200),
            containerView.heightAnchor.constraint(equalToConstant: 160),

            // Icon
            iconView.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            iconView.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 24),
            iconView.widthAnchor.constraint(equalToConstant: 60),
            iconView.heightAnchor.constraint(equalToConstant: 60),

            // Bookmark shape
            bookmarkShape.centerXAnchor.constraint(equalTo: iconView.centerXAnchor),
            bookmarkShape.centerYAnchor.constraint(equalTo: iconView.centerYAnchor),
            bookmarkShape.widthAnchor.constraint(equalToConstant: 28),
            bookmarkShape.heightAnchor.constraint(equalToConstant: 34),

            // Status label
            statusLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            statusLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -24),

            // Checkmark
            checkmarkView.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            checkmarkView.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 32),
            checkmarkView.widthAnchor.constraint(equalToConstant: 48),
            checkmarkView.heightAnchor.constraint(equalToConstant: 48),
        ])

        // Add notch to bookmark using a triangle mask
        addBookmarkNotch()

        // Tap to dismiss
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissExtension))
        view.addGestureRecognizer(tapGesture)
    }

    private func addBookmarkNotch() {
        // Create triangle notch at bottom of bookmark
        let notchLayer = CAShapeLayer()
        let path = UIBezierPath()
        path.move(to: CGPoint(x: 0, y: 34))
        path.addLine(to: CGPoint(x: 14, y: 26))
        path.addLine(to: CGPoint(x: 28, y: 34))
        path.addLine(to: CGPoint(x: 28, y: 0))
        path.addLine(to: CGPoint(x: 0, y: 0))
        path.close()
        notchLayer.path = path.cgPath
        bookmarkShape.layer.mask = notchLayer
    }

    private func extractAndSaveURL() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else {
            showError()
            return
        }

        for attachment in attachments {
            // Try URL first
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (data, error) in
                    DispatchQueue.main.async {
                        if let url = data as? URL {
                            self?.saveURL(url.absoluteString)
                        } else {
                            self?.showError()
                        }
                    }
                }
                return
            }

            // Try plain text (might contain URL)
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (data, error) in
                    DispatchQueue.main.async {
                        if let text = data as? String {
                            // Extract URL from text if present
                            let urlString = self?.extractURL(from: text) ?? text
                            self?.saveURL(urlString)
                        } else {
                            self?.showError()
                        }
                    }
                }
                return
            }
        }

        showError()
    }

    private func extractURL(from text: String) -> String {
        // Try to find a URL in the text
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))

        if let match = matches?.first, let range = Range(match.range, in: text) {
            return String(text[range])
        }
        return text
    }

    private func saveURL(_ urlString: String) {
        // Save to App Group UserDefaults
        if let userDefaults = UserDefaults(suiteName: appGroupId) {
            // Save URL for the app to pick up
            userDefaults.set(urlString, forKey: sharedKey)
            userDefaults.set(Date().timeIntervalSince1970, forKey: "ShareTimestamp")
            userDefaults.synchronize()

            // Show brief success then open the app
            showSuccessAndOpenApp(urlString)
        } else {
            showError()
        }
    }

    private func showSuccessAndOpenApp(_ urlString: String) {
        UIView.animate(withDuration: 0.2) {
            self.iconView.alpha = 0
            self.checkmarkView.alpha = 1
            self.statusLabel.text = "Opening NotiF..."
            self.statusLabel.textColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
        }

        // Open the app via URL scheme after brief delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.openContainingApp(with: urlString)
        }
    }

    private func openContainingApp(with urlString: String) {
        // Encode the URL for passing via URL scheme
        guard let encodedUrl = urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let appUrl = URL(string: "notif://share?url=\(encodedUrl)") else {
            self.dismissExtension()
            return
        }

        // Open containing app via URL scheme
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(appUrl, options: [:]) { _ in
                    self.dismissExtension()
                }
                return
            }
            responder = responder?.next
        }

        // Fallback: use openURL selector (works in extensions)
        let selector = sel_registerName("openURL:")
        responder = self
        while responder != nil {
            if responder!.responds(to: selector) {
                responder!.perform(selector, with: appUrl)
                break
            }
            responder = responder?.next
        }

        // Dismiss after attempting to open
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.dismissExtension()
        }
    }

    private func showSuccess() {
        UIView.animate(withDuration: 0.3) {
            self.iconView.alpha = 0
            self.checkmarkView.alpha = 1
            self.statusLabel.text = "Saved to NotiF!"
            self.statusLabel.textColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
        }

        // Auto dismiss after 1 second
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.dismissExtension()
        }
    }

    private func showError() {
        statusLabel.text = "Failed to save"
        statusLabel.textColor = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.dismissExtension()
        }
    }

    @objc private func dismissExtension() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
