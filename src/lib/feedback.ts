import { buzz } from "./native/platform";

let audio: AudioContext | undefined;
let lastClick = 0;
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
  } catch {
    /* Audio is optional on unsupported browsers. */
  }
}
export function playSound(kind: "click" | "reply") {
  if (document.visibilityState === "hidden") return;
  try {
    if (!audio || audio.state !== "running") return;
    const now = audio.currentTime;
    const tones = kind === "click" ? [520] : [660, 880];
    tones.forEach((frequency, index) => {
      const oscillator = audio!.createOscillator();
      const gain = audio!.createGain();
      const start = now + index * 0.09;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        kind === "click" ? 0.025 : 0.045,
        start + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + (kind === "click" ? 0.045 : 0.15),
      );
      oscillator.connect(gain).connect(audio!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    /* Never interrupt an interaction for feedback. */
  }
}
export function clickFeedback(sound: boolean, haptics: boolean) {
  if (Date.now() - lastClick < 70) return;
  lastClick = Date.now();
  if (sound) {
    unlockAudio();
    playSound("click");
  }
  if (haptics) void buzz().catch(() => {});
}
