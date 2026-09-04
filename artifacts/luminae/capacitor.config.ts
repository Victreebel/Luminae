import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.luminae.game",
  appName: "Luminae",
  webDir: "dist/public",
  android: {
    backgroundColor: "#0a0c14",
    captureInput: true,
    allowMixedContent: false,
  },
};

export default config;
