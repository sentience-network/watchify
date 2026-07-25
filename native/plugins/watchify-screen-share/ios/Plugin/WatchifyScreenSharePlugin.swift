import Foundation
import UIKit
import ReplayKit

#if canImport(Capacitor)
import Capacitor

/**
 Capacitor plugin: presents ReplayKit broadcast picker and relays JPEG frames
 from the Broadcast Upload Extension (App Group) into the WebView as events.

 JS listens for `frame` / `started` / `stopped` and builds a canvas MediaStream
 for the existing Watchify WebRTC party path.
 */
@objc(WatchifyScreenSharePlugin)
public class WatchifyScreenSharePlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "WatchifyScreenSharePlugin"
  public let jsName = "WatchifyScreenShare"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "startBroadcast", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "stopBroadcast", returnType: CAPPluginReturnPromise),
  ]

  private let observer = ScreenFrameObserver()
  private var pickerHost: UIView?
  private var lastEmittedPts: Int64 = -1
  private var listening = false

  public override func load() {
    observer.onStarted = { [weak self] in
      self?.notifyListeners("started", data: [:])
    }
    observer.onStopped = { [weak self] in
      self?.notifyListeners("stopped", data: [:])
    }
    observer.onFrame = { [weak self] in
      self?.emitLatestFrame()
    }
  }

  @objc func isAvailable(_ call: CAPPluginCall) {
    call.resolve([
      "available": true,
      "preferredExtension": WatchifyScreenShareConstants.broadcastBundleId,
      "appGroupId": WatchifyScreenShareConstants.appGroupId,
    ])
  }

  @objc func startBroadcast(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      self.ensureListening()
      self.presentBroadcastPicker()
      call.resolve(["started": true])
    }
  }

  @objc func stopBroadcast(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      self.removePicker()
      self.notifyListeners("stopped", data: ["reason": "stopBroadcast"])
      call.resolve()
    }
  }

  private func ensureListening() {
    guard !listening else { return }
    listening = true
    observer.start()
  }

  private func emitLatestFrame() {
    guard let frame = ScreenFrameRelay.shared.readLatestFrame() else { return }
    if frame.ptsMs == lastEmittedPts { return }
    lastEmittedPts = frame.ptsMs
    notifyListeners("frame", data: [
      "jpegBase64": frame.jpegBase64,
      "width": frame.width,
      "height": frame.height,
      "ptsMs": frame.ptsMs,
    ])
  }

  private func presentBroadcastPicker() {
    guard let bridgeView = bridge?.viewController?.view else { return }
    removePicker()

    let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 60, height: 60))
    picker.preferredExtension = WatchifyScreenShareConstants.broadcastBundleId
    picker.showsMicrophoneButton = false
    picker.isHidden = true
    bridgeView.addSubview(picker)
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
      host.center = CGPoint(x: bridgeView.bounds.midX, y: bridgeView.bounds.midY)
      DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
        self.removePicker()
      }
    }
  }

  private func removePicker() {
    pickerHost?.removeFromSuperview()
    pickerHost = nil
  }
}
#endif
