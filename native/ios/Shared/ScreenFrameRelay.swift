import Foundation
import CoreImage
import CoreMedia
import CoreVideo
import ImageIO
import UniformTypeIdentifiers

/// App Group + Darwin IPC between Broadcast Upload Extension and the main app.
/// Extension writes throttled JPEG frames; main app observes and forwards to JS.
public enum WatchifyScreenShareConstants {
  public static let appGroupId = "group.com.watchify.app"
  public static let broadcastBundleId = "com.watchify.app.Broadcast"
  public static let frameFileName = "latest-frame.jpg"
  public static let metaFileName = "latest-frame.json"
  public static let darwinStarted = "com.watchify.app.broadcast.started"
  public static let darwinStopped = "com.watchify.app.broadcast.stopped"
  public static let darwinFrame = "com.watchify.app.broadcast.frame"
  /// Target ~12–15 fps over the JS bridge (extension may capture faster).
  public static let minFrameIntervalMs: Int64 = 70
  public static let maxEncodeWidth: CGFloat = 720
  public static let jpegQuality: CGFloat = 0.55
}

public final class ScreenFrameRelay {
  public static let shared = ScreenFrameRelay()

  private let queue = DispatchQueue(label: "com.watchify.screen-relay", qos: .userInitiated)
  private var lastPtsMs: Int64 = 0
  private var broadcasting = false

  private var containerURL: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: WatchifyScreenShareConstants.appGroupId)
  }

  public func markBroadcastStarted() {
    queue.async {
      self.broadcasting = true
      self.lastPtsMs = 0
      self.postDarwin(WatchifyScreenShareConstants.darwinStarted)
      self.writeMeta(["state": "started", "ts": Date().timeIntervalSince1970])
    }
  }

  public func markBroadcastFinished() {
    queue.async {
      self.broadcasting = false
      self.postDarwin(WatchifyScreenShareConstants.darwinStopped)
      self.writeMeta(["state": "stopped", "ts": Date().timeIntervalSince1970])
    }
  }

  public func handleVideo(_ sampleBuffer: CMSampleBuffer) {
    queue.async {
      guard self.broadcasting else { return }
      let nowMs = Int64(Date().timeIntervalSince1970 * 1000)
      if nowMs - self.lastPtsMs < WatchifyScreenShareConstants.minFrameIntervalMs {
        return
      }
      guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
      guard let jpeg = Self.encodeJPEG(
        pixelBuffer: imageBuffer,
        maxWidth: WatchifyScreenShareConstants.maxEncodeWidth,
        quality: WatchifyScreenShareConstants.jpegQuality
      ) else { return }

      guard let dir = self.containerURL else { return }
      let frameURL = dir.appendingPathComponent(WatchifyScreenShareConstants.frameFileName)
      do {
        try jpeg.data.write(to: frameURL, options: .atomic)
        self.writeMeta([
          "state": "frame",
          "width": jpeg.width,
          "height": jpeg.height,
          "ptsMs": nowMs,
          "ts": Date().timeIntervalSince1970,
        ])
        self.lastPtsMs = nowMs
        self.postDarwin(WatchifyScreenShareConstants.darwinFrame)
      } catch {
        // Extension memory is tight — drop frame on write failure.
      }
    }
  }

  public func handleAudioApp(_ sampleBuffer: CMSampleBuffer) {
    // Audio over App Group JPEG bridge is out of scope for v1.
    // Host mic in the WebRTC room remains available from the main app.
    _ = sampleBuffer
  }

  public func readLatestFrame() -> (jpegBase64: String, width: Int, height: Int, ptsMs: Int64)? {
    guard let dir = containerURL else { return nil }
    let frameURL = dir.appendingPathComponent(WatchifyScreenShareConstants.frameFileName)
    let metaURL = dir.appendingPathComponent(WatchifyScreenShareConstants.metaFileName)
    guard let data = try? Data(contentsOf: frameURL), !data.isEmpty else { return nil }
    var width = 0
    var height = 0
    var ptsMs: Int64 = 0
    if let metaData = try? Data(contentsOf: metaURL),
       let obj = try? JSONSerialization.jsonObject(with: metaData) as? [String: Any] {
      width = obj["width"] as? Int ?? 0
      height = obj["height"] as? Int ?? 0
      if let n = obj["ptsMs"] as? NSNumber { ptsMs = n.int64Value }
    }
    return (data.base64EncodedString(), width, height, ptsMs)
  }

  private func writeMeta(_ dict: [String: Any]) {
    guard let dir = containerURL else { return }
    let url = dir.appendingPathComponent(WatchifyScreenShareConstants.metaFileName)
    guard let data = try? JSONSerialization.data(withJSONObject: dict, options: []) else { return }
    try? data.write(to: url, options: .atomic)
  }

  private func postDarwin(_ name: String) {
    CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      CFNotificationName(name as CFString),
      nil,
      nil,
      true
    )
  }

  private struct EncodedJPEG {
    let data: Data
    let width: Int
    let height: Int
  }

  private static func encodeJPEG(pixelBuffer: CVPixelBuffer, maxWidth: CGFloat, quality: CGFloat) -> EncodedJPEG? {
    CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

    let w = CVPixelBufferGetWidth(pixelBuffer)
    let h = CVPixelBufferGetHeight(pixelBuffer)
    let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
    let scale = min(1, maxWidth / CGFloat(max(w, 1)))
    let scaled = ciImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let context = CIContext(options: [.useSoftwareRenderer: false])
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }

    let mutable = NSMutableData()
    guard let dest = CGImageDestinationCreateWithData(
      mutable,
      UTType.jpeg.identifier as CFString,
      1,
      nil
    ) else { return nil }
    CGImageDestinationAddImage(dest, cgImage, [
      kCGImageDestinationLossyCompressionQuality: quality,
    ] as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { return nil }
    return EncodedJPEG(
      data: mutable as Data,
      width: Int(scaled.extent.width.rounded()),
      height: Int(scaled.extent.height.rounded())
    )
  }
}

/// Observe Darwin notifications from the Broadcast Extension on the main app.
public final class ScreenFrameObserver {
  public var onStarted: (() -> Void)?
  public var onStopped: (() -> Void)?
  public var onFrame: (() -> Void)?

  private var startedToken: UnsafeRawPointer?
  private var stoppedToken: UnsafeRawPointer?
  private var frameToken: UnsafeRawPointer?

  public init() {}

  public func start() {
    let center = CFNotificationCenterGetDarwinNotifyCenter()
    startedToken = register(center, WatchifyScreenShareConstants.darwinStarted) { [weak self] in
      self?.onStarted?()
    }
    stoppedToken = register(center, WatchifyScreenShareConstants.darwinStopped) { [weak self] in
      self?.onStopped?()
    }
    frameToken = register(center, WatchifyScreenShareConstants.darwinFrame) { [weak self] in
      self?.onFrame?()
    }
  }

  public func stop() {
    let center = CFNotificationCenterGetDarwinNotifyCenter()
    if let t = startedToken {
      CFNotificationCenterRemoveObserver(center, t, CFNotificationName(WatchifyScreenShareConstants.darwinStarted as CFString), nil)
    }
    if let t = stoppedToken {
      CFNotificationCenterRemoveObserver(center, t, CFNotificationName(WatchifyScreenShareConstants.darwinStopped as CFString), nil)
    }
    if let t = frameToken {
      CFNotificationCenterRemoveObserver(center, t, CFNotificationName(WatchifyScreenShareConstants.darwinFrame as CFString), nil)
    }
    startedToken = nil
    stoppedToken = nil
    frameToken = nil
  }

  private func register(
    _ center: CFNotificationCenter?,
    _ name: String,
    _ handler: @escaping () -> Void
  ) -> UnsafeRawPointer {
    let box = HandlerBox(handler)
    let ptr = Unmanaged.passRetained(box).toOpaque()
    CFNotificationCenterAddObserver(
      center,
      ptr,
      { _, observer, _, _, _ in
        guard let observer else { return }
        let box = Unmanaged<HandlerBox>.fromOpaque(observer).takeUnretainedValue()
        DispatchQueue.main.async { box.handler() }
      },
      name as CFString,
      nil,
      .deliverImmediately
    )
    return UnsafeRawPointer(ptr)
  }

  private final class HandlerBox {
    let handler: () -> Void
    init(_ handler: @escaping () -> Void) { self.handler = handler }
  }

  deinit { stop() }
}
