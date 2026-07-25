import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let window = UIWindow(frame: UIScreen.main.bounds)
    let url = URL(string: ProcessInfo.processInfo.environment["WATCHIFY_URL"]
      ?? "https://watchify-web-9rx1.onrender.com")!
    window.rootViewController = WatchifyHostViewController(startURL: url)
    window.makeKeyAndVisible()
    self.window = window
    return true
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    // watchify://party/<id> → load party URL in the WebView host.
    guard url.scheme == "watchify" else { return false }
    NotificationCenter.default.post(name: .watchifyOpenURL, object: url)
    return true
  }
}

extension Notification.Name {
  static let watchifyOpenURL = Notification.Name("watchifyOpenURL")
}
