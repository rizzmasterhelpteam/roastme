import { Keyboard } from "@capacitor/keyboard";

/** Native IME events own visibility; viewport events only update available space. */
export function trackKeyboardViewport() {
  let disposed = false;
  let nativeVisible: boolean | undefined;
  let baseline = window.innerHeight;
  let frame = 0;
  const handles: { remove(): Promise<void> }[] = [];
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (disposed) return;
      const height = Math.round(Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight));
      if (nativeVisible !== true) baseline = Math.max(baseline, window.innerHeight);
      const visible = nativeVisible ?? baseline - height > 140;
      document.documentElement.style.setProperty("--app-viewport-height", `${height}px`);
      document.documentElement.classList.toggle("keyboard-open", visible);
      document.body.classList.toggle("keyboard-open", visible);
      const focused = document.activeElement;
      if (visible && focused instanceof HTMLElement && !focused.closest(".insta-composer-footer"))
        focused.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  };
  const setVisible = (visible: boolean) => { nativeVisible = visible; sync(); };
  const keep = (pending: Promise<{ remove(): Promise<void> }>) => {
    void pending.then(handle => { if (disposed) void handle.remove(); else handles.push(handle); });
  };
  keep(Keyboard.addListener("keyboardWillShow", () => setVisible(true)));
  keep(Keyboard.addListener("keyboardDidShow", () => setVisible(true)));
  keep(Keyboard.addListener("keyboardDidHide", () => setVisible(false)));
  const rotate = () => { baseline = window.innerHeight; sync(); };
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", rotate);
  window.visualViewport?.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("scroll", sync);
  sync();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    handles.forEach(handle => void handle.remove());
    window.removeEventListener("resize", sync);
    window.removeEventListener("orientationchange", rotate);
    window.visualViewport?.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("scroll", sync);
    document.documentElement.style.removeProperty("--app-viewport-height");
    document.documentElement.classList.remove("keyboard-open");
    document.body.classList.remove("keyboard-open");
  };
}
