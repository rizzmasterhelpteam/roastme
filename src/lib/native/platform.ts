import { Capacitor, registerPlugin } from "@capacitor/core";
import { resolveApiOrigin } from "./api-url";
export const isNative = () => Capacitor.isNativePlatform();
export const apiOrigin = () =>
  resolveApiOrigin(process.env.NEXT_PUBLIC_API_URL);
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
export async function buzz() {
  if (isNative()) {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
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
