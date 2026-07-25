import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type ScreenFrameEvent = {
  jpegBase64: string;
  width: number;
  height: number;
  ptsMs?: number;
};

export interface WatchifyScreenSharePlugin {
  isAvailable(): Promise<{
    available: boolean;
    preferredExtension?: string;
    appGroupId?: string;
  }>;
  startBroadcast(): Promise<{ started?: boolean }>;
  stopBroadcast(): Promise<void>;
  addListener(
    eventName: "frame",
    listenerFunc: (event: ScreenFrameEvent) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "started" | "stopped" | "error",
    listenerFunc: (event: { message?: string; reason?: string }) => void
  ): Promise<PluginListenerHandle>;
}

const WatchifyScreenShare = registerPlugin<WatchifyScreenSharePlugin>(
  "WatchifyScreenShare",
  {
    web: () => ({
      async isAvailable() {
        return { available: false };
      },
      async startBroadcast() {
        throw new Error(
          "WatchifyScreenShare is only available in the iOS app (ReplayKit)."
        );
      },
      async stopBroadcast() {},
      async addListener() {
        return { remove: async () => undefined };
      },
    }),
  }
);

export default WatchifyScreenShare;
