import Foundation
import UIKit
import WebKit
import ReplayKit

/**
 Thin WKWebView host (Capacitor-free path) that injects `window.WatchifyNative.screenShare`
 matching the web bridge in `src/lib/ios-screen-share.ts`.

 Use this if you prefer a minimal Swift shell instead of full Capacitor.
 Capacitor path uses WatchifyScreenSharePlugin.swift instead.
 */
final class WatchifyNativeBridge: NSObject, WKScriptMessageHandler {
  private weak var webView: WKWebView?
  private let observer = ScreenFrameObserver()
  private var lastEmittedPts: Int64 = -1
  private var pickerHost: UIView?

  init(webView: WKWebView) {
    self.webView = webView
    super.init()
    observer.onStarted = { [weak self] in
      self?.eval("window.dispatchEvent(new CustomEvent('watchify-ios-screen-started'))")
    }
    observer.onStopped = { [weak self] in
      self?.eval("""
        window.dispatchEvent(new CustomEvent('watchify-ios-screen-stopped'));
        if (window.WatchifyNative && window.WatchifyNative._onStopped) window.WatchifyNative._onStopped();
      """)
    }
    observer.onFrame = { [weak self] in
      self?.emitLatestFrame()
    }
    observer.start()
  }

  func install() {
    let js = """
    (function () {
      if (window.WatchifyNative && window.WatchifyNative.screenShare) return;
      const listeners = { frame: [], started: [], stopped: [], error: [] };
      function emit(type, data) {
        (listeners[type] || []).forEach(function (cb) { try { cb(data); } catch (e) {} });
      }
      window.WatchifyNative = {
        platform: 'ios',
        _emit: emit,
        _onStopped: null,
        screenShare: {
          isAvailable: function () { return Promise.resolve(true); },
          startBroadcast: function () {
            window.webkit.messageHandlers.watchifyScreenShare.postMessage({ action: 'startBroadcast' });
            return Promise.resolve({ started: true });
          },
          stopBroadcast: function () {
            window.webkit.messageHandlers.watchifyScreenShare.postMessage({ action: 'stopBroadcast' });
            return Promise.resolve();
          },
          addListener: function (event, cb) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(cb);
            return Promise.resolve({ remove: function () {
              listeners[event] = (listeners[event] || []).filter(function (x) { return x !== cb; });
            }});
          }
        }
      };
      window.addEventListener('watchify-ios-screen-frame', function (ev) {
        emit('frame', ev.detail || {});
      });
      window.addEventListener('watchify-ios-screen-started', function () { emit('started', {}); });
      window.addEventListener('watchify-ios-screen-stopped', function () { emit('stopped', {}); });
    })();
    true;
    """
    let script = WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    webView?.configuration.userContentController.addUserScript(script)
    webView?.configuration.userContentController.add(self, name: "watchifyScreenShare")
  }

  func userContentController(
    _ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage
  ) {
    guard message.name == "watchifyScreenShare",
          let body = message.body as? [String: Any],
          let action = body["action"] as? String else { return }
    DispatchQueue.main.async {
      switch action {
      case "startBroadcast":
        self.presentBroadcastPicker()
        self.replyOk(message)
      case "stopBroadcast":
        self.removePicker()
        self.replyOk(message)
      default:
        self.replyOk(message)
      }
    }
  }

  private func replyOk(_ message: WKScriptMessage) {
    // postMessage promises are resolved via optional completion eval if needed.
    _ = message
  }

  private func emitLatestFrame() {
    guard let frame = ScreenFrameRelay.shared.readLatestFrame() else { return }
    if frame.ptsMs == lastEmittedPts { return }
    lastEmittedPts = frame.ptsMs
    let payload: [String: Any] = [
      "jpegBase64": frame.jpegBase64,
      "width": frame.width,
      "height": frame.height,
      "ptsMs": frame.ptsMs,
    ]
    guard let data = try? JSONSerialization.data(withJSONObject: payload),
          let json = String(data: data, encoding: .utf8) else { return }
    eval("""
      window.dispatchEvent(new CustomEvent('watchify-ios-screen-frame', { detail: \(json) }));
      if (window.WatchifyNative && window.WatchifyNative._emit) {
        window.WatchifyNative._emit('frame', \(json));
      }
    """)
  }

  private func presentBroadcastPicker() {
    guard let view = webView else { return }
    removePicker()
    let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 60, height: 60))
    picker.preferredExtension = WatchifyScreenShareConstants.broadcastBundleId
    picker.showsMicrophoneButton = false
    picker.isHidden = true
    view.addSubview(picker)
    pickerHost = picker
    for sub in picker.subviews {
      if let button = sub as? UIButton {
        button.sendActions(for: .allTouchEvents)
        break
      }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
      guard let self, let host = self.pickerHost else { return }
      host.isHidden = false
      host.center = CGPoint(x: view.bounds.midX, y: view.bounds.midY)
      DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
        self.removePicker()
      }
    }
  }

  private func removePicker() {
    pickerHost?.removeFromSuperview()
    pickerHost = nil
  }

  private func eval(_ js: String) {
    webView?.evaluateJavaScript(js, completionHandler: nil)
  }
}
