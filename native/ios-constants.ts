/**
 * Watchify iOS native shell + ReplayKit Broadcast Upload Extension.
 *
 * Web app lives in WKWebView (Capacitor or thin host). Screen share uses
 * ReplayKit → App Group JPEG relay → JS canvas.captureStream → existing WebRTC.
 *
 * Compile/sign on a Mac with Xcode. Windows can edit sources; cannot produce
 * a device build here.
 */

export const WATCHIFY_IOS = {
  bundleId: "com.watchify.app",
  broadcastExtensionId: "com.watchify.app.Broadcast",
  appGroupId: "group.com.watchify.app",
  pluginName: "WatchifyScreenShare",
  deepLinkScheme: "watchify",
} as const;
