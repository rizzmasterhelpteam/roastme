import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import { Network } from "@capacitor/network";
import { SplashScreen } from "@capacitor/splash-screen";
import { Preferences } from "@capacitor/preferences";
import { AppProvider } from "@/components/app-provider";
import { Shell } from "@/components/shell";
import { AppScreen } from "@/components/screens";
import { consumeAuthLink } from "@/lib/native/auth";
import { recordAppOpen } from "@/lib/native/notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import "@/app/globals.css";
import "./native.css";
import "@/app/modern.css";
import "@/app/light.css";

function NativeApp() {
  const location = useLocation(),
    navigate = useNavigate();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.classList.add("native-app");
    if (!Capacitor.isNativePlatform()) return;
    void recordAppOpen().catch(() => {});
    void Preferences.get({ key: "roast-welcomed-v1" }).then(
      async ({ value }) => {
        if (!value && window.location.pathname === "/") {
          await Preferences.set({ key: "roast-welcomed-v1", value: "true" });
          navigate("/onboarding", { replace: true });
        }
      },
    );
    let disposed = false;
    const handles: { remove: () => Promise<void> }[] = [];
    const add = async (p: Promise<{ remove: () => Promise<void> }>) => {
      const h = await p;
      if (disposed) await h.remove();
      else handles.push(h);
    };
    void add(
      App.addListener("backButton", () => {
        const modal = document.querySelector<HTMLDialogElement>("dialog[open]");
        if (modal) {
          modal.dispatchEvent(new Event("cancel", { cancelable: true }));
          return;
        }
        if (document.body.classList.contains("keyboard-open")) {
          void Keyboard.hide();
          return;
        }
        if (window.history.state?.idx > 0) navigate(-1);
        else if (window.location.pathname !== "/")
          navigate("/", { replace: true });
        else void App.minimizeApp();
      }),
    );
    void add(
      App.addListener("appUrlOpen", ({ url }) => {
        void consumeAuthLink(url)
          .then((ok) => {
            if (ok) navigate("/", { replace: true });
          })
          .catch((e) =>
            window.dispatchEvent(
              new CustomEvent("roast:notice", { detail: e.message }),
            ),
          );
      }),
    );
    void App.getLaunchUrl().then((result) => {
      if (result)
        void consumeAuthLink(result.url)
          .then((ok) => {
            if (ok) navigate("/", { replace: true });
          })
          .catch((error) =>
            window.dispatchEvent(
              new CustomEvent("roast:notice", { detail: error.message }),
            ),
          );
    });
    void add(
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void recordAppOpen().catch(() => {});
        window.dispatchEvent(
          new CustomEvent("roast:active", { detail: isActive }),
        );
      }),
    );
    void add(
      LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (event) => {
          if (event.notification.extra?.kind === "daily-roast") navigate("/");
        },
      ),
    );
    const onKeyboardShow = () => {
      document.documentElement.classList.add("keyboard-open");
      document.body.classList.add("keyboard-open");
    };
    const onKeyboardHide = () => {
      document.documentElement.classList.remove("keyboard-open");
      document.body.classList.remove("keyboard-open");
    };
    void add(Keyboard.addListener("keyboardWillShow", onKeyboardShow));
    void add(Keyboard.addListener("keyboardDidShow", onKeyboardShow));
    void add(Keyboard.addListener("keyboardWillHide", onKeyboardHide));
    void add(Keyboard.addListener("keyboardDidHide", onKeyboardHide));

    const onViewportResize = () => {
      if (window.visualViewport) {
        const isKeyboard =
          window.innerHeight - window.visualViewport.height > 140;
        if (isKeyboard) onKeyboardShow();
        else onKeyboardHide();
      }
    };
    window.visualViewport?.addEventListener("resize", onViewportResize);

    const onFocusIn = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") {
        onKeyboardShow();
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") {
        setTimeout(() => {
          const activeTag = document.activeElement?.tagName?.toLowerCase();
          if (!activeTag || !["input", "textarea"].includes(activeTag)) {
            onKeyboardHide();
          }
        }, 120);
      }
    };
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    const onScrollLock = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("scroll", onScrollLock, { passive: true });
    void Network.getStatus().then((s) => setOffline(!s.connected));
    void add(
      Network.addListener("networkStatusChange", (s) =>
        setOffline(!s.connected),
      ),
    );
    void SplashScreen.hide();
    return () => {
      disposed = true;
      for (const h of handles) void h.remove();
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", onScrollLock);
    };
  }, [navigate]);
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        {offline && (
          <div className="offline-banner" role="status">
            You’re offline. Your saved roasts are still here.
          </div>
        )}
        <Shell>
          <AppScreen segments={location.pathname.split("/").filter(Boolean)} />
        </Shell>
      </AppProvider>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <NativeApp />
  </BrowserRouter>,
);
