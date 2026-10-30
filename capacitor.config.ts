import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "ai.roastme.app",
  appName: "Roast Me AI",
  webDir: "dist-native",
  server: { androidScheme: "https", hostname: "localhost" },
  android: {
    backgroundColor: "#000000",
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      launchFadeOutDuration: 0,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash_blank",
      showSpinner: false,
    },
    Keyboard: { resizeOnFullScreen: true },
    StatusBar: { style: "DARK", backgroundColor: "#090a20" },
    LocalNotifications: { smallIcon: "ic_notification", iconColor: "#b68aff" },
    CapacitorHttp: { enabled: false },
  },
};
export default config;
