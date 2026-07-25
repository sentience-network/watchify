import UIKit
import WebKit

/**
 Minimal iOS host for Watchify parties + ReplayKit screen share.
 Prefer Capacitor (`npx cap add ios`) in production; this file is the
 thin-shell alternative used during scaffold / debugging.
 */
final class WatchifyHostViewController: UIViewController, WKNavigationDelegate {
  private var webView: WKWebView!
  private var bridge: WatchifyNativeBridge!
  private let startURL: URL

  init(startURL: URL = URL(string: "https://watchify-web-9rx1.onrender.com")!) {
    self.startURL = startURL
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.04, green: 0.06, blue: 0.08, alpha: 1)

    let config = WKWebViewConfiguration()
    config.allowsInlineMediaPlayback = true
    config.mediaTypesRequiringUserActionForPlayback = []

    webView = WKWebView(frame: view.bounds, configuration: config)
    webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    webView.navigationDelegate = self
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    view.addSubview(webView)

    bridge = WatchifyNativeBridge(webView: webView)
    bridge.install()

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleOpenURL(_:)),
      name: .watchifyOpenURL,
      object: nil
    )

    webView.load(URLRequest(url: startURL))
  }

  @objc private func handleOpenURL(_ note: Notification) {
    guard let url = note.object as? URL else { return }
    // watchify://party/<id> → https://…/parties/<id>
    let path = url.host.map { host in
      let rest = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
      if host == "party", !rest.isEmpty {
        return "/parties/\(rest)"
      }
      return "/\(host)" + (rest.isEmpty ? "" : "/\(rest)")
    } ?? "/parties"
    if var components = URLComponents(url: startURL, resolvingAgainstBaseURL: false) {
      components.path = path
      if let target = components.url {
        webView.load(URLRequest(url: target))
      }
    }
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}
