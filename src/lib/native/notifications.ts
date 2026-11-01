/** Daily, device-local reminders. No usage data leaves the device. */
import {
  LocalNotifications,
  type Weekday,
} from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { SecureSession, isNative } from "./platform";

export const REMINDER_MESSAGES = [
  "Your free credits are ready. Your ego might not be.",
  "A fresh roast is waiting whenever you are.",
  "Your daily dose of friendly fire is here.",
  "Got a minute? Your roast squad misses you.",
  "Fresh credits. Familiar questionable decisions.",
  "Your roast personalities are warmed up and waiting.",
  "Come collect a little character development.",
  "Your daily roast break is ready when you are.",
  "A little laugh looks good on your schedule.",
  "Your credits refreshed. Let the harmless chaos begin.",
  "A fresh batch of burns just left the kitchen.",
  "Ready for a lovingly delivered reality check?",
  "Your favorite roast master has entered the chat.",
  "New day, new credits, same roastable energy.",
] as const;
const KEY = "roast-daily-notifications-v1";
const BASE = 47100;
const CHANNEL = "daily-roast-reminders";
type ReminderState = {
  enabled: boolean;
  asked: boolean;
  installedAt: number;
  opens: number[];
};
let task: Promise<unknown> = Promise.resolve();
let webTimer: ReturnType<typeof setTimeout> | undefined;
function stopWebTimer() {
  if (webTimer) clearTimeout(webTimer);
  webTimer = undefined;
}
async function showWebNotification(body: string) {
  const options = {
    body,
    icon: "/favicon-savage.png",
    tag: "daily-roast",
    silent: true,
  };
  if ("serviceWorker" in navigator) {
    const registration =
      await navigator.serviceWorker.register("/reminder-sw.js");
    if (!registration.active) await navigator.serviceWorker.ready;
    await registration.showNotification("Roast Me AI", options);
  } else {
    const notification = new Notification("Roast Me AI", options);
    notification.onclick = () => {
      window.focus();
      notification.close();
      location.assign("/");
    };
  }
}
function scheduleWeb(state: ReminderState) {
  stopWebTimer();
  if (
    !state.enabled ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;
  const now = new Date();
  const choice = chooseReminderTime(
    state.installedAt,
    state.opens,
    now.getTime(),
  );
  const at = new Date(now);
  at.setHours(choice.hour, choice.minute, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  webTimer = setTimeout(() => {
    void read()
      .then(async (latest) => {
        if (!latest?.enabled || Notification.permission !== "granted") return;
        const day = new Date().toDateString();
        const last = await Preferences.get({ key: KEY + "-last-web" });
        if (last.value !== day) {
          await showWebNotification(
            REMINDER_MESSAGES[randomIndex(REMINDER_MESSAGES.length)],
          );
          await Preferences.set({ key: KEY + "-last-web", value: day });
        }
        scheduleWeb(latest);
      })
      .catch(() => {});
  }, at.getTime() - now.getTime());
}
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = task.then(fn, fn);
  task = next.catch(() => {});
  return next;
}
async function read(): Promise<ReminderState | null> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return null;
  try {
    return JSON.parse(value) as ReminderState;
  } catch {
    return null;
  }
}
async function write(state: ReminderState) {
  await Preferences.set({ key: KEY, value: JSON.stringify(state) });
  window.dispatchEvent(new Event("roast:notifications-changed"));
}
export function chooseReminderTime(
  installedAt: number,
  opens: number[],
  now: number,
): { hour: number; minute: number } {
  const initial = new Date(installedAt);
  if (now - installedAt < 3 * 86400000)
    return { hour: initial.getHours(), minute: initial.getMinutes() };
  const recent = opens.filter((t) => t <= now && t >= now - 60 * 86400000);
  const days = new Set(recent.map((t) => new Date(t).toDateString()));
  if (days.size < 3)
    return { hour: initial.getHours(), minute: initial.getMinutes() };
  const bins = Array.from({ length: 24 }, () => 0);
  for (const t of recent) bins[new Date(t).getHours()]++;
  const preferred = initial.getHours();
  let best = preferred,
    score = -1;
  for (let h = 0; h < 24; h++) {
    const value = bins[h] * 2 + bins[(h + 23) % 24] + bins[(h + 1) % 24];
    if (value > score || (value === score && h === preferred)) {
      best = h;
      score = value;
    }
  }
  const minutes = recent
    .map((t) => new Date(t))
    .filter((d) => d.getHours() === best)
    .map((d) => d.getMinutes())
    .sort((a, b) => a - b);
  return {
    hour: best,
    minute: minutes.length
      ? minutes[Math.floor(minutes.length / 2)]
      : initial.getMinutes(),
  };
}
function randomIndex(max: number): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}
async function cancel() {
  if (!isNative()) {
    stopWebTimer();
    return;
  }
  await LocalNotifications.cancel({
    notifications: Array.from({ length: 7 }, (_, i) => ({ id: BASE + i })),
  });
}
async function schedule(state: ReminderState, preserveToday: boolean) {
  if (!isNative()) {
    scheduleWeb(state);
    return;
  }
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") {
    if (state.enabled) {
      state.enabled = false;
      await write(state);
    }
    await cancel();
    return;
  }
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: "Daily roast reminders",
    description: "One daily reminder at your usual time",
    importance: 3,
    visibility: 0,
  });
  const now = Date.now(),
    choice = chooseReminderTime(state.installedAt, state.opens, now);
  const today = new Date(now).getDay();
  const pending = await LocalNotifications.getPending();
  const todayExists =
    preserveToday && pending.notifications.some((n) => n.id === BASE + today);
  const slots = Array.from({ length: 7 }, (_, i) => i).filter(
    (i) => !(todayExists && i === today),
  );
  await LocalNotifications.cancel({
    notifications: slots.map((i) => ({ id: BASE + i })),
  });
  let previous = -1;
  const notifications = slots.map((i) => {
    let picked = randomIndex(REMINDER_MESSAGES.length);
    if (picked === previous)
      picked =
        (picked + 1 + randomIndex(REMINDER_MESSAGES.length - 1)) %
        REMINDER_MESSAGES.length;
    previous = picked;
    return {
      id: BASE + i,
      title: "Roast Me AI",
      body: REMINDER_MESSAGES[picked],
      channelId: CHANNEL,
      isExactNotification: false,
      schedule: {
        on: {
          weekday: (i + 1) as Weekday,
          hour: choice.hour,
          minute: choice.minute,
          second: 0,
        },
        allowWhileIdle: false,
      },
      extra: { kind: "daily-roast" },
    };
  });
  await LocalNotifications.schedule({ notifications });
}
export async function notificationEnabled(): Promise<boolean> {
  const state = await read();
  if (!state?.enabled) return false;
  if (!isNative())
    return "Notification" in window && Notification.permission === "granted";
  return (await LocalNotifications.checkPermissions()).display === "granted";
}
export function setNotificationEnabled(enabled: boolean): Promise<boolean> {
  const webPermission =
    enabled && !isNative() && "Notification" in window && window.isSecureContext
      ? Notification.permission === "granted"
        ? Promise.resolve("granted")
        : Notification.requestPermission()
      : undefined;
  return serial(async () => {
    let state = await read();
    if (!state)
      state = {
        enabled: false,
        asked: true,
        installedAt: (
          await SecureSession.installTime().catch(() => ({
            timestamp: Date.now(),
          }))
        ).timestamp,
        opens: [],
      };
    if (enabled) {
      if (!isNative()) {
        if (!("Notification" in window) || !window.isSecureContext)
          throw new Error(
            "This browser does not support notifications. Use the Android app for daily background reminders.",
          );
        // Ask during the explicit toggle action, never during page initialization.
        const permission = await webPermission;
        state.enabled = permission === "granted";
        state.asked = true;
        await write(state);
        scheduleWeb(state);
        return state.enabled;
      }
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== "granted")
        permission = await LocalNotifications.requestPermissions();
      if (permission.display !== "granted") {
        state.enabled = false;
        state.asked = true;
        await write(state);
        await cancel();
        return false;
      }
    }
    if (enabled) {
      try {
        await schedule(state, true);
      } catch (error) {
        await cancel().catch(() => {});
        state.enabled = false;
        state.asked = true;
        await write(state);
        throw error;
      }
    } else {
      await cancel();
    }
    state.enabled = enabled;
    state.asked = true;
    await write(state);
    return enabled;
  });
}
export async function testNotification(): Promise<void> {
  if (!(await notificationEnabled()))
    throw new Error("Enable notifications first.");
  if (!isNative()) {
    await showWebNotification(
      "Your reminders are ready. Your ego has been warned.",
    );
    return;
  }
  await LocalNotifications.schedule({
    notifications: [
      {
        id: BASE + 20,
        title: "Roast Me AI",
        body: "Your reminders are ready. Your ego has been warned.",
        channelId: CHANNEL,
        schedule: { at: new Date(Date.now() + 3000) },
        extra: { kind: "daily-roast" },
      },
    ],
  });
}
export function recordAppOpen(): Promise<void> {
  return serial(async () => {
    const now = Date.now();
    let state = await read();
    if (!state) {
      const installed = (
        await SecureSession.installTime().catch(() => ({ timestamp: now }))
      ).timestamp;
      state = {
        enabled: false,
        asked: true,
        installedAt: installed,
        opens: [],
      };
      if (!isNative()) {
        await write(state);
        return;
      }
      let permission = await LocalNotifications.checkPermissions();
      if (
        permission.display === "prompt" ||
        permission.display === "prompt-with-rationale"
      )
        permission = await LocalNotifications.requestPermissions();
      state.enabled = permission.display === "granted";
    }
    state.opens = state.opens.filter(
      (t) => t >= now - 60 * 86400000 && t <= now,
    );
    const last = state.opens[state.opens.length - 1];
    if (!last || now - last >= 30 * 60000) state.opens.push(now);
    await write(state);
    if (state.enabled) await schedule(state, true);
  });
}
export function clearNotificationData(): Promise<void> {
  return serial(async () => {
    try {
      await cancel();
    } finally {
      await Preferences.remove({ key: KEY });
      await Preferences.remove({ key: KEY + "-last-web" });
      window.dispatchEvent(new Event("roast:notifications-changed"));
    }
  });
}
