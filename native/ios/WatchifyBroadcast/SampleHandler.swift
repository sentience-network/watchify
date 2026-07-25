import ReplayKit

/// ReplayKit Broadcast Upload Extension entry point.
/// Captures device screen (and optional app audio) while the user broadcasts
/// "Watchify" from Control Center / the system picker.
class SampleHandler: RPBroadcastSampleHandler {
  override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
    _ = setupInfo
    ScreenFrameRelay.shared.markBroadcastStarted()
  }

  override func broadcastPaused() {
    // Keep last frame; no-op.
  }

  override func broadcastResumed() {
    // no-op
  }

  override func broadcastFinished() {
    ScreenFrameRelay.shared.markBroadcastFinished()
  }

  override func processSampleBuffer(
    _ sampleBuffer: CMSampleBuffer,
    with sampleBufferType: RPSampleBufferType
  ) {
    switch sampleBufferType {
    case .video:
      ScreenFrameRelay.shared.handleVideo(sampleBuffer)
    case .audioApp:
      ScreenFrameRelay.shared.handleAudioApp(sampleBuffer)
    case .audioMic:
      break
    @unknown default:
      break
    }
  }
}
