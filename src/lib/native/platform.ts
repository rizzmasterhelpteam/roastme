import { Capacitor, registerPlugin } from "@capacitor/core";
import { resolveApiOrigin } from "./api-url";
export const isNative = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === "android";
const NativeGoogleAuth = registerPlugin<{
  signIn(options: { nonce: string }): Promise<{ token?: string }>;
}>("NativeGoogleAuth");

export async function getAndroidGoogleCredential() {
  const bytesToHex = (bytes: Uint8Array) =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const { token } = await NativeGoogleAuth.signIn({ nonce: bytesToHex(new Uint8Array(digest)) });
  return token ? { provider: "google" as const, token, nonce } : null;
}
export const apiOrigin = () => resolveApiOrigin();
export const authRedirect = () =>
  isNative()
    ? "ai.roastme.app://auth/callback"
    : `${location.origin}/auth/callback`;
export const SecureSession = registerPlugin<{
  installTime(): Promise<{ timestamp: number }>;
  get(o: { key: string }): Promise<{ value: string | null }>;
  set(o: { key: string; value: string }): Promise<void>;
  remove(o: { key: string }): Promise<void>;
}>("SecureSession");
export const sessionStorage = {
  getItem: async (key: string) => (await SecureSession.get({ key })).value,
  setItem: async (key: string, value: string) => {
    await SecureSession.set({ key, value });
  },
  removeItem: async (key: string) => {
    await SecureSession.remove({ key });
  },
};
export async function copyText(text: string) {
  if (isNative()) {
    const { Clipboard } = await import("@capacitor/clipboard");
    await Clipboard.write({ string: text });
  } else await navigator.clipboard.writeText(text);
}
let lastBuzz = 0;
export async function buzz() {
  if (Date.now() - lastBuzz < 80) return;
  lastBuzz = Date.now();
  if (isNative()) {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.vibrate({ duration: 18 });
  } else navigator.vibrate?.(20);
}
export async function shareImage(blob: Blob, share: boolean) {
  if (!isNative()) return false;
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const path = `roast-shares/roast-${Date.now()}.png`;
  const file = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  const { Share } = await import("@capacitor/share");
  await Share.share({
    title: "My ego survived Roast Me AI",
    files: [file.uri],
    dialogTitle: share ? "Share your roast" : "Save or share your roast card",
  });
  return true;
}
