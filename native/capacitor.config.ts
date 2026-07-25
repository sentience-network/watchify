import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor loads the live Watchify web app. Screen share works only when this
 * native shell + Broadcast Upload Extension are installed on device.
 *
 * Override server.url for local Mac testing:
 *   CAPACITOR_SERVER_URL=http://<lan-ip>:3344 npx cap sync ios
 */
const config: CapacitorConfig = {
  appId: "com.watchify.app",
  appName: "Watchify",
  webDir: "www",
  server: {
    url:
      process.env.CAPACITOR_SERVER_URL ||
      "https://watchify-web-9rx1.onrender.com",
    cleartext: Boolean(process.env.CAPACITOR_SERVER_URL?.startsWith("http://")),
  },
  ios: {
    scheme: "Watchify",
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    WatchifyScreenShare: {
      preferredExtension: "com.watchify.app.Broadcast",
      appGroupId: "group.com.watchify.app",
    },
  },
};

export default config;
