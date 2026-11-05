"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { defaultState, levelFromChaos, type AppState } from "@/lib/personas";
import { browserSupabase } from "@/lib/supabase";
import { isNative, authRedirect } from "@/lib/native/platform";
import { clickFeedback, playSound, unlockAudio } from "@/lib/feedback";
type ApiBody = Record<string, unknown>;
type ApiResult = { state?: AppState; [key: string]: unknown };
export class ClientError extends Error {
  constructor(
    message: string,
    public blocked = false,
    public outOfCredits = false,
  ) {
    super(message);
  }
}
type Context = {
  state: AppState;
  ready: boolean;
  toast: (text: string) => void;
  api: (path: string, body?: ApiBody) => Promise<ApiResult>;
  reload: () => Promise<void>;
  level: string;
  setLevel: (s: string) => void;
  chaos: number;
  replyLength: "short" | "medium" | "long";
  setReplyLength: (value: "short" | "medium" | "long") => void;
  setChaos: (n: number) => void;
  auth: (method: string, email?: string) => Promise<void>;
  signout: () => Promise<void>;
  awardCredits: (n: number) => void;
};
const AppContext = createContext<Context>(null!);
export const useApp = () => useContext(AppContext);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(defaultState),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [startupError, setStartupError] = useState(""),
    [level, setLevel] = useState("Light"),
    [replyLength, setReplyLength] = useState<"short" | "medium" | "long">(
      "medium",
    ),
    [chaos, setChaosState] = useState(30);
  const preferences = useRef({ replyLength, settings: state.settings });
  preferences.current = { replyLength, settings: state.settings };
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest(
              "button, a, input[type=checkbox], input[type=range], select, summary",
            )
          : null;
      if (!target || target.matches(":disabled, [aria-disabled=true]")) return;
      const settings = preferences.current.settings;
      clickFeedback(settings.sound === true, settings.haptics === true);
    };
    const unlock = () => {
      if (preferences.current.settings.sound) unlockAudio();
    };
    document.addEventListener("click", click, true);
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
  }, []);
  const setChaos = useCallback((value: number) => {
    const next = Number.isFinite(value)
      ? Math.max(0, Math.min(100, Math.round(value)))
      : 30;
    setChaosState(next);
    setLevel(levelFromChaos(next));
  }, []);
  const toast = useCallback((text: string) => setNotice(text), []);
  useEffect(() => {
    if (isNative()) return;
    const refresh = () => {
      void import("@/lib/native/notifications")
        .then(({ recordAppOpen }) => recordAppOpen())
        .catch(() => {});
    };
    refresh();
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, []);
  useEffect(() => {
    const dark = state.settings.dark !== false;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#090a20" : "#fbf6ed");
    if (isNative()) {
      void import("@capacitor/status-bar")
        .then(async ({ StatusBar, Style }) => {
          await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
          await StatusBar.setBackgroundColor({
            color: dark ? "#090a20" : "#fbf6ed",
          });
        })
        .catch(() => {});
    }
  }, [state.settings.dark]);
  const awardCredits = useCallback((n: number) => {
    setState((prev) => ({ ...prev, credits: prev.credits + n }));
  }, []);
  const api = useCallback(async (path: string, body?: ApiBody) => {
    if (path === "roast" && body)
      body = {
        ...body,
        replyLength: preferences.current.replyLength,
        language: preferences.current.settings.language || "English",
      };
    const replyFeedback = () => {
      if (path !== "roast") return;
      if (preferences.current.settings.sound) playSound("reply");
      if (preferences.current.settings.haptics)
        void import("@/lib/native/platform")
          .then(({ buzz }) => buzz())
          .catch(() => {});
    };
    const sb = browserSupabase();
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    if (isNative()) {
      const { nativeRequest } = await import("@/lib/native/client");
      const { status, data } = await nativeRequest(
        path,
        body,
        session?.access_token,
        session?.user.id,
      );
      if (status >= 400)
        throw new ClientError(
          data.error || "Please try again.",
          data.blocked,
          status === 402,
        );
      if (data.state) setState(data.state);
      else if (path === "state") setState(data);
      replyFeedback();
      return data as ApiResult;
    }
    const res = await fetch(`/api/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    if (!res.ok)
      throw new ClientError(
        data.error || "Something went wrong.",
        data.blocked,
        res.status === 402,
      );
    if (data.state) setState(data.state);
    else if (path === "state") setState(data);
    replyFeedback();
    return data as ApiResult;
  }, []);
  const reload = useCallback(async () => {
    await api("state");
  }, [api]);
  useEffect(() => {
    let mounted = true;
    const sb = browserSupabase();
    async function init() {
      try {
        if (sb) {
          const { data } = await sb.auth.getSession();
          if (!data.session) {
            const result = await sb.auth.signInAnonymously();
            if (result.error) throw result.error;
          }
        }
        await api("state");
        if (mounted) setReady(true);
      } catch (e) {
        if (mounted) {
          const message = e instanceof Error ? e.message : "Unable to load account.";
          if (isNative()) setStartupError(message);
          else {
            toast(message);
            setReady(true);
          }
        }
      }
    }
    void init();
    const refresh = () => void reload().catch(() => {});
    const showNotice = (e: Event) => toast((e as CustomEvent).detail);
    const active = (e: Event) => {
      if ((e as CustomEvent).detail) {
        sb?.auth.startAutoRefresh();
        refresh();
      } else sb?.auth.stopAutoRefresh();
    };
    let resetTimer: ReturnType<typeof setTimeout>;
    const scheduleReset = () => {
      const now = Date.now();
      const nextUtcDay = Math.floor(now / 86400000 + 1) * 86400000;
      resetTimer = setTimeout(
        () => {
          refresh();
          scheduleReset();
        },
        nextUtcDay - now + 1000,
      );
    };
    scheduleReset();
    const visibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("roast:refresh", refresh);
    window.addEventListener("roast:notice", showNotice);
    window.addEventListener("roast:active", active);
    const subscription = sb?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED")
        setTimeout(() => void reload().catch(() => {}), 0);
    });
    try {
      const saved = JSON.parse(localStorage.getItem("roast-controls") || "{}");
      if (typeof saved.chaos === "number") setChaos(saved.chaos);
      if (["short", "medium", "long"].includes(saved.replyLength))
        setReplyLength(saved.replyLength);
    } catch {}
    return () => {
      mounted = false;
      clearTimeout(resetTimer);
      document.removeEventListener("visibilitychange", visibility);
      subscription?.data.subscription.unsubscribe();
      window.removeEventListener("roast:refresh", refresh);
      window.removeEventListener("roast:notice", showNotice);
      window.removeEventListener("roast:active", active);
    };
  }, [reload, toast]);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(
          "roast-controls",
          JSON.stringify({ level, chaos, replyLength }),
        );
      } catch {}
    }
  }, [level, chaos, replyLength, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const auth = async (method: string, email?: string) => {
    const sb = browserSupabase();
    if (!sb) {
      if (method === "guest") {
        toast("You’re in! Enjoy 5 demo credits.");
        return;
      }
      throw new Error(
        "Connect Supabase to enable Google and email sign-in. You can try the app as a guest.",
      );
    }
    const user = (await sb.auth.getUser()).data.user;
    if (method === "guest") {
      if (!user) {
        const { error } = await sb.auth.signInAnonymously();
        if (error) throw error;
      }
      await reload();
      return;
    }
    if (method === "google" || method === "google-link") {
      const result =
        method === "google-link" && user?.is_anonymous
          ? await sb.auth.linkIdentity({
              provider: "google",
              options: {
                redirectTo: authRedirect(),
                skipBrowserRedirect: isNative(),
              },
            })
          : await sb.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: authRedirect(),
                skipBrowserRedirect: isNative(),
              },
            });
      if (result.error) throw result.error;
      if (isNative() && result.data.url) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: result.data.url });
      }
      return;
    }
    const result = user?.is_anonymous
      ? await sb.auth.updateUser({ email }, { emailRedirectTo: authRedirect() })
      : await sb.auth.signInWithOtp({
          email: email!,
          options: { emailRedirectTo: authRedirect() },
        });
    if (result.error) throw result.error;
    toast(
      "Check your email for a secure sign-in link. Your guest data stays with this account.",
    );
  };
  const signout = async () => {
    const sb = browserSupabase();
    if (sb) {
      const { error } = await sb.auth.signOut();
      if (error) throw error;
    }
    location.href = "/sign-in";
  };
  return (
    <AppContext.Provider
      value={{
        state,
        ready,
        toast,
        api,
        reload,
        level,
        setLevel,
        chaos,
        replyLength,
        setReplyLength,
        setChaos,
        auth,
        signout,
        awardCredits,
      }}
    >
      {isNative() && !ready ? (
        <div
          aria-busy={!startupError}
          aria-label="Loading your account"
          style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", zIndex: 10000, display: "grid", placeItems: "center", padding: 24 }}
        >
          {startupError && (
            <div role="alert" style={{ maxWidth: 320, textAlign: "center" }}>
              <p>Unable to open your account.</p>
              <p>{startupError}</p>
              <button type="button" onClick={() => window.location.reload()}>Try again</button>
            </div>
          )}
        </div>
      ) : children}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
