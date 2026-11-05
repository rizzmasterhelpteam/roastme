"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Flame,
  Sparkles,
  ShieldCheck,
  Zap,
  MessageSquare,
  ImagePlus,
  Swords,
  Crown,
  Trophy,
  Coins,
  Copy,
  Heart,
  Share2,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Send,
  Upload,
  X,
  Check,
  Gift,
  Clapperboard,
  LoaderCircle,
  RefreshCw,
  Download,
  UserRound,
  Mail,
  ChevronRight,
  ChevronDown,
  Settings as SettingsIcon,
  Bell,
  Volume2,
  Smartphone,
  Moon,
  Globe,
  CircleHelp,
  LogOut,
  Link2,
  LockKeyhole,
  CheckCircle2,
  WandSparkles,
  Info,
  MoreHorizontal,
} from "lucide-react";
import { useApp, ClientError } from "./app-provider";
import { Portrait } from "./art";
import { Controls } from "./controls";
import { Button } from "./ui/button";
import { personas, findPersona, type Roast } from "@/lib/personas";
import { reportReasons } from "@/lib/validation";
import { replyLanguages, languageLabels } from "@/lib/languages";
import { playSound, unlockAudio } from "@/lib/feedback";
import {
  copyText,
  shareImage,
  isNative,
  apiOrigin,
} from "@/lib/native/platform";

function Heading({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="page-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>
        {icon}
        {title}
      </h1>
      {description && <p>{description}</p>}
    </div>
  );
}
function Back({ label = "Back to the roast room" }: { label?: string }) {
  return (
    <Link className="back-link" href="/">
      <ArrowLeft size={15} />
      {label}
    </Link>
  );
}
function DemoNotice() {
  const { state } = useApp();
  return state.demo ? (
    <div className="demo-notice">
      <Info size={14} />
      <span>
        {isNative()
          ? "On-device demo · sample responses, no live AI · your roasts stay on this device"
          : "Demo kitchen · sample responses · credits and history reset when the server restarts"}
      </span>
    </div>
  ) : null;
}
function useAction() {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: async (fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        return await fn();
      } catch (e) {
        toast(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please retry.",
        );
      } finally {
        setBusy(false);
      }
    },
  };
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const current = ref.current;
    return () => current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function OutOfCredits({ close }: { close: () => void }) {
  const { api, toast, state } = useApp();
  const { busy, run } = useAction();
  const [showPremium, setShowPremium] = useState(false);

  if (showPremium) return (
    <Modal title="Premium" onClose={close}>
      <Premium inModal />
    </Modal>
  );

  return (
    <Modal title="Your credits" onClose={close}>
      <div className="out-of-credits-body credit-modal">
        <div className="credit-modal-balance">
          <span className="credit-modal-icon">
            <Coins size={22} />
          </span>
          <div>
            <small>YOUR BALANCE</small>
            <strong>
              {state.premium ? "Unlimited" : `${state.credits} credits`}
            </strong>
          </div>
        </div>
        <h3>Keep the roasts coming.</h3>
        <p>
          Get more credits with a rewarded ad, or go Premium for unlimited
          roasts.
        </p>
        <div className="credit-modal-actions">
          <button
            type="button"
            onClick={() => setShowPremium(true)}
            className="credit-modal-option premium-option"
          >
            <span className="credit-option-icon">
              <Crown size={20} />
            </span>
            <span>
              <b>Go Premium</b>
              <small>Unlimited roasts · no ads</small>
            </span>
            <ChevronRight size={17} />
          </button>
          {!state.premium && state.credits === 0 && <button
            type="button"
            className="credit-modal-option"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api("rewards/ad", {});
                toast("5 credits added.");
                close();
              })
            }
          >
            <span className="credit-option-icon">
              {busy ? (
                <LoaderCircle className="spin" size={20} />
              ) : (
                <Clapperboard size={20} />
              )}
            </span>
            <span>
              <b>{busy ? "Checking your reward…" : "Watch an ad"}</b>
              <small>Earn 5 credits after watching</small>
            </span>
            <ChevronRight size={17} />
          </button>}
        </div>
        <div className="credit-modal-reset">
          <Info size={15} />
          <span>
            Free credits reset to 5 at 00:00 UTC every day. Unused credits do
            not carry over.
          </span>
        </div>
        <button type="button" className="credit-modal-later" onClick={close}>
          Maybe later
        </button>
      </div>
    </Modal>
  );
}

const personaStarters: Record<string, string[]> = {
  savage: [
    "Roast my dating bio 💔",
    "Roast my work from home routine 💻",
    "I procrastinate on everything ⏰",
    "Humble my ego right now 🔥",
  ],
  grandma: [
    "Judge my life choices, dear ☕",
    "Tell me why I'm still single 👵",
    "Roast my questionable outfit 🧶",
    "Give me some tough love 💕",
  ],
  ceo: [
    "Conduct my annual performance review 📊",
    "Synergize my lack of ambition 💼",
    "Roast my startup idea 📉",
    "Put my career on a PIP 📋",
  ],
  cat: [
    "I'm seeking your feline validation 🐾",
    "Roast my low-budget main character energy 😼",
    "Judge my late-night snack choices 🐟",
    "Knock my self-esteem off the counter 📦",
  ],
  robot: [
    "Diagnose my emotional errors 🤖",
    "Compute stats on my bad decisions ⚙️",
    "Scan routine for motivation: 404 💾",
    "Deliver a cold logical reality check ⚡",
  ],
  drama: [
    "Turn my tiny problem into a 3-act play 🎭",
    "Judge the audacity of my outfit 💅",
    "Roast my romantic decisions darling 🍷",
    "The drama! The catastrophe! Roast me 👑",
  ],
};

export function SavedPage() {
  const { state, api, toast } = useApp();
  const [query, setQuery] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<string>("all");

  const saved = state.history.filter((r) => r.saved);

  const filtered = saved.filter((r) => {
    const matchesPersona =
      selectedPersona === "all" || r.persona === selectedPersona;
    const matchesQuery =
      !query ||
      `${r.content} ${r.prompt} ${findPersona(r.persona).name}`
        .toLowerCase()
        .includes(query.toLowerCase());
    return matchesPersona && matchesQuery;
  });

  async function unsave(r: Roast) {
    try {
      await api("history/save", { id: r.id, saved: false });
      toast("Removed from saved burns.");
    } catch {
      toast("Could not unsave roast.");
    }
  }

  return (
    <div className="screen-narrow saved-page">
      <Back label="Back to roast room" />
      <Heading
        title="Saved roasts"
        description="Your best burns, in one place."
        icon={<Heart size={26} fill="#f43f5e" color="#f43f5e" />}
      />

      <div className="saved-page-controls">
        <div className="saved-search-wrap">
          <input
            type="search"
            placeholder="Search saved burns…"
            className="saved-page-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {saved.length > 0 && (
          <div className="saved-persona-filters">
            <button
              type="button"
              className={`saved-filter-chip ${selectedPersona === "all" ? "active" : ""}`}
              onClick={() => setSelectedPersona("all")}
            >
              All burns ({saved.length})
            </button>
            {personas.map((p) => {
              const count = saved.filter((r) => r.persona === p.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`saved-filter-chip ${selectedPersona === p.id ? "active" : ""}`}
                  onClick={() => setSelectedPersona(p.id)}
                >
                  <Portrait id={p.id} className="saved-filter-avatar" />
                  <span>
                    {p.name} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {saved.length === 0 ? (
        <div className="empty-state saved-empty-state">
          <div className="saved-empty-heart-ring">
            <Heart size={44} fill="#f43f5e33" color="#f43f5e" />
          </div>
          <h2>Your trophy case is empty</h2>
          <p>
            When a roast hits a little too close to home, tap the heart (❤️)
            under any message to preserve it here for your emotional
            development.
          </p>
          <Link href="/" className="btn btn-primary">
            <Flame size={18} />
            Go get roasted
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No matching burns found</h3>
          <p>
            Try searching for a different word or clearing your persona filter.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setQuery("");
              setSelectedPersona("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="saved-page-grid">
          {filtered.map((r) => {
            const p = findPersona(r.persona);
            return (
              <article key={r.id} className="saved-roast-card">
                <div className="saved-card-top">
                  <div className="saved-card-persona">
                    <Portrait id={r.persona} className="saved-card-avatar" />
                    <b>{p.name}</b>
                  </div>
                  <button
                    type="button"
                    className="saved-unsave-button"
                    onClick={() => void unsave(r)}
                    title="Remove from saved"
                    aria-label="Remove from saved"
                  >
                    <Heart size={16} fill="#f43f5e" color="#f43f5e" />
                  </button>
                </div>

                {r.prompt && (
                  <div className="saved-card-prompt" title={r.prompt}>
                    <span>“{r.prompt}”</span>
                  </div>
                )}

                <p className="saved-card-text">{r.content}</p>

                <div className="saved-card-bottom">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      void copyText(r.content);
                      toast("Roast copied to clipboard.");
                    }}
                  >
                    <Copy size={13} /> Copy
                  </button>
                  <Link
                    href={`/share/${r.id}`}
                    className="btn btn-outline btn-sm"
                  >
                    <Share2 size={13} /> Share
                  </Link>
                  <Link
                    href={`/chat/${r.persona}`}
                    className="btn btn-ghost btn-sm ml-auto"
                    aria-label={`Chat with ${p.name}`}
                  >
                    <MessageSquare size={13} /> Chat
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const SavedRepliesModal = SavedPage;

function InstaChatScreen({
  initialPersonaId = "savage",
}: {
  initialPersonaId?: string;
}) {
  const { state, api, level, chaos, toast, ready } = useApp();
  const [selected, setSelected] = useState(initialPersonaId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const { busy: adBusy, run: runAd } = useAction();
  const [pendingMessage, setPendingMessage] = useState<{ text: string; image: boolean } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCredits = () =>
    window.dispatchEvent(new CustomEvent("roast:open-credits"));

  const p = findPersona(selected);
  const savedCount = state.history.filter((r) => r.saved).length;

  useEffect(() => {
    if (initialPersonaId && initialPersonaId !== selected) {
      setSelected(initialPersonaId);
    }
  }, [initialPersonaId]);

  useEffect(() => {
    if (!ready) return;
    const latestSession = state.history.find(
      (r) =>
        r.persona === selected &&
        (r.type === "chat" || r.type === "image" || !r.type) &&
        r.session_id,
    )?.session_id;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(`roast-session:${selected}`);
    } catch {}
    setSessionId(stored || latestSession || crypto.randomUUID());
  }, [ready, selected]);

  const activeSessionId =
    sessionId ||
    state.history.find(
      (r) =>
        r.persona === selected &&
        (r.type === "chat" || r.type === "image" || !r.type) &&
        r.session_id,
    )?.session_id;
  const messages = state.history
    .filter(
      (r) =>
        r.persona === selected &&
        (!activeSessionId || r.session_id === activeSessionId) &&
        (r.type === "chat" || r.type === "image" || !r.type),
    )
    .slice()
    .reverse();

  useLayoutEffect(() => {
    if (!ready) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const firstLoadedView = !initialScrollDoneRef.current;
    initialScrollDoneRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: firstLoadedView || busy ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    ready,
    selected,
    messages.length,
    messages[messages.length - 1]?.id,
    busy,
  ]);

  function startNewChat() {
    setNewChatConfirmOpen(false);
    const nextSession = crypto.randomUUID();
    try {
      sessionStorage.setItem(`roast-session:${selected}`, nextSession);
    } catch {}
    setSessionId(nextSession);
    setBlocked(false);
    setLikedMap({});
    setPrompt("");
    setAttachedImage("");
    setAttachedFileName("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    toast(`Started a fresh conversation with ${p.name}.`);
  }

  async function handleImageAttach(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > (isNative() ? 20 : 5) * 1024 * 1024
    ) {
      toast(
        `Choose a JPG, PNG, or WebP smaller than ${isNative() ? 20 : 5} MB.`,
      );
      return;
    }
    if (isNative()) {
      try {
        const { preparePhoto } = await import("@/lib/native/photos");
        setAttachedImage(await preparePhoto(file));
        setAttachedFileName(file.name);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Could not open this photo.");
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
      setAttachedFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function toggleLike(r: Roast) {
    const isCurrentlyLiked =
      likedMap[r.id] ?? (r.feedback === "like" || r.saved);
    setLikedMap((prev) => ({ ...prev, [r.id]: !isCurrentlyLiked }));
    try {
      await api("history/feedback", {
        id: r.id,
        feedback: !isCurrentlyLiked ? "like" : null,
      });
      if (!isCurrentlyLiked) {
        toast("❤️ Added heart reaction.");
      }
    } catch {
      // ignore
    }
  }

  async function submit(value = prompt) {
    if (busy || !ready || !sessionId) return;
    const hasImg = Boolean(attachedImage);
    const cost = hasImg ? 2 : 1;
    if (!state.premium && state.credits < cost) {
      if (state.credits > 0) openCredits();
      return;
    }
    const text =
      value.trim() ||
      (hasImg
        ? "Roast my own photo. I consent to a playful roast of the styling and scene."
        : "");
    if (!hasImg && text.length < 2) {
      toast("Give us a little more to work with.");
      return;
    }
    setBusy(true);
    setPendingMessage({ text, image: hasImg });
    setPrompt("");
    setAttachedImage("");
    setAttachedFileName("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setBlocked(false);
    const sid = sessionId || crypto.randomUUID();
    if (!sessionId) setSessionId(sid);

    try {
      await api("roast", {
        prompt: text,
        persona: selected,
        type: hasImg ? "image" : "chat",
        level,
        chaos,
        requestId: crypto.randomUUID(),
        sessionId: sid,
        ...(hasImg ? { image: attachedImage } : {}),
      });
    } catch (e) {
      setPrompt((current) => current || (value === prompt ? value : ""));
      if (hasImg) {
        setAttachedImage(attachedImage);
        setAttachedFileName(attachedFileName);
      }
      if (e instanceof ClientError && e.outOfCredits) openCredits();
      else if (e instanceof ClientError && e.blocked) setBlocked(true);
      else
        toast(
          e instanceof Error ? e.message : "The roast could not be generated.",
        );
    } finally {
      setPendingMessage(null);
      setBusy(false);
    }
  }

  const starters = personaStarters[p.id] || personaStarters.savage;

  return (
    <div
      className="insta-chat-screen"
      style={{ "--persona-color": p.color } as React.CSSProperties}
    >
      {/* Top Instagram DM Navigation Header */}
      <header className="insta-header">
        <div className="insta-header-left">
          <div
            className="insta-story-ring"
            onClick={() => setDropdownOpen((v) => !v)}
            role="button"
            tabIndex={0}
            aria-label="Toggle persona selection dropdown"
          >
            <Portrait id={p.id} className="insta-avatar" />
            <span className="insta-active-dot" />
          </div>

          <div className="insta-user-meta">
            <button
              type="button"
              className="insta-dropdown-btn"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span className="insta-persona-name">{p.name}</span>
              <span className="insta-sparkle-badge" title="Verified Roast AI">
                <Sparkles size={13} />
              </span>
              <ChevronDown
                size={16}
                className={`insta-chevron ${dropdownOpen ? "open" : ""}`}
              />
            </button>
            <span className="insta-online-status">
              <span className="insta-pulse-dot" />
              Active now · Direct Roast
            </span>
          </div>
        </div>

        <div className="insta-header-right">
          {/* Heart shape symbol for Saved roasts page */}
          <Link
            href="/saved"
            className="insta-icon-btn insta-heart-nav-btn"
            title="Saved roasts"
            aria-label="View saved roasts"
          >
            <Heart
              size={17}
              fill={savedCount > 0 ? "#f43f5e" : "none"}
              color={savedCount > 0 ? "#f43f5e" : "currentColor"}
            />
            {savedCount > 0 && (
              <span className="insta-heart-badge-count">{savedCount}</span>
            )}
          </Link>

          <button
            type="button"
            className="insta-credit-btn credit-badge"
            onClick={openCredits}
            title="Your credits · click to get more"
            aria-label="View credits"
          >
            <Coins size={14} />
            <b>{state.premium ? "∞" : state.credits}</b>
          </button>
          <button
            type="button"
            className="insta-heat-btn"
            onClick={() => setControlOpen(true)}
            title="Adjust Roast Chaos"
          >
            <Flame size={15} />
            <span>{chaos}%</span>
          </button>
          <button
            type="button"
            className="insta-icon-btn"
            onClick={() => setNewChatConfirmOpen(true)}
            disabled={busy}
            title="Start fresh conversation"
            aria-label="Start fresh chat"
          >
            <RefreshCw size={17} />
          </button>
          <Link
            href="/profile"
            className="insta-icon-btn insta-account-btn"
            aria-label="View account"
            title="Your account"
          >
            <UserRound size={20} />
          </Link>
        </div>

        {/* Floating Persona Dropdown */}
        {dropdownOpen && (
          <>
            <div
              className="insta-dropdown-backdrop"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="insta-dropdown-panel" role="listbox">
              <div className="insta-dropdown-header">
                <div>
                  <span className="eyebrow">SWITCH ROAST MASTER</span>
                  <h3>Who’s roasting you today?</h3>
                </div>
                <span className="insta-dropdown-count">6 personalities</span>
              </div>
              <div className="insta-dropdown-grid">
                {personas.map((item) => {
                  const isCur = item.id === selected;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isCur}
                      className={`persona-card insta-dropdown-item ${isCur ? "selected" : ""}`}
                      style={
                        { "--persona-color": item.color } as React.CSSProperties
                      }
                      onClick={() => {
                        setSelected(item.id);
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="insta-item-avatar-wrap">
                        <Portrait id={item.id} className="insta-item-avatar" />
                        <span className="insta-item-online" />
                      </div>
                      <div className="insta-item-text">
                        <div className="insta-item-top">
                          <span className="insta-item-name">{item.name}</span>
                          <span className="insta-item-label">{item.label}</span>
                        </div>
                        <p className="insta-item-tagline">{item.tagline}</p>
                      </div>
                      {isCur ? (
                        <span className="insta-item-check">
                          <Check size={16} />
                        </span>
                      ) : (
                        <ChevronRight
                          size={15}
                          className="insta-item-chevron"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Chat Thread */}
      <div ref={viewportRef} className="insta-chat-viewport">
        <DemoNotice />

        {/* Empty State / Instagram DM Profile Card */}
        {messages.length === 0 && !busy && (
          <div className="insta-profile-intro">
            <div className="insta-intro-avatar-ring">
              <Portrait id={p.id} className="insta-intro-avatar" />
            </div>
            <h2>
              {p.name}
              <span className="insta-sparkle-badge">
                <Sparkles size={16} />
              </span>
            </h2>
            <div className="insta-intro-handle">
              @{p.id}.roast · Official AI Personality
            </div>
            <p className="insta-intro-tagline">“{p.tagline}”</p>
            <p className="insta-intro-bio">{p.description}</p>

            <div className="insta-intro-badges">
              {p.tags.map((t) => (
                <span key={t} className="insta-intro-badge">
                  {t}
                </span>
              ))}
            </div>

            <div className="insta-starter-section">
              <span className="insta-starter-title">Break the ice:</span>
              <div className="insta-starter-chips">
                {starters.map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    className="insta-chip"
                    onClick={() => {
                      setPrompt(txt);
                      void submit(txt);
                    }}
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Exchanges */}
        <div className="insta-messages-list">
          {messages.map((r) => {
            const isLiked =
              likedMap[r.id] ?? (r.feedback === "like" || r.saved);

            return (
              <div key={r.id} className="insta-exchange">
                {/* Outgoing User Message Bubble */}
                <div className="insta-bubble-wrap user">
                  <div className="insta-user-bubble">
                    {r.type === "image" && (
                      <div className="insta-user-photo-indicator">
                        <ImagePlus size={13} />
                        <span>Photo roast</span>
                      </div>
                    )}
                    {r.prompt}
                  </div>
                </div>

                {/* Incoming Persona Message Bubble */}
                <div className="insta-bubble-wrap assistant">
                  <div className="insta-assistant-row">
                    <Portrait
                      id={r.persona}
                      className="insta-bubble-avatar avatar"
                    />
                    <div className="insta-assistant-body">
                      <div className="insta-msg-header">
                        <span className="insta-msg-author">{p.name}</span>
                        <span className="insta-msg-time">
                          {new Date(r.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div
                        className="insta-assistant-bubble"
                        onDoubleClick={() => void toggleLike(r)}
                        title="Double-click to like"
                      >
                        <p>{r.content}</p>
                        {isLiked && (
                          <span
                            className="insta-heart-badge"
                            title="Liked roast"
                          >
                            ❤️
                          </span>
                        )}
                      </div>

                      {/* Action Toolbar Below Bubble */}
                      <RoastActions
                        compact
                        roast={r}
                        regenerate={() => void submit(r.prompt)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {pendingMessage && (
            <div className="insta-bubble-wrap user">
              <div className="insta-user-bubble">
                {pendingMessage.image && <div className="insta-user-photo-indicator"><ImagePlus size={13} /><span>Photo roast</span></div>}
                {pendingMessage.text}
              </div>
            </div>
          )}

          {!state.premium && state.credits === 0 && !busy && (
            <div className="chat-credit-offer">
              <p>No credits left. Keep the roasts coming.</p>
              <div className="chat-credit-offer-actions">
                <button type="button" onClick={() => setPremiumOpen(true)}><b>Go Premium</b><small>Unlimited roasts</small></button>
                <button type="button" disabled={adBusy} onClick={() => void runAd(async () => { await api("rewards/ad", {}); toast("5 credits added."); })}><b>{adBusy ? "Loading…" : "Watch an ad"}</b><small>+5 credits</small></button>
              </div>
              <small>Free credits reset at 00:00 UTC.</small>
            </div>
          )}

          {/* Typing Indicator */}
          {busy && (
            <div className="insta-bubble-wrap assistant typing-state">
              <div className="insta-assistant-row">
                <Portrait id={p.id} className="insta-bubble-avatar avatar" />
                <div className="insta-typing-pill">
                  <span />
                  <span />
                  <span />
                  <small>{p.name} is roasting…</small>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
        {premiumOpen && <Modal title="Premium" onClose={() => setPremiumOpen(false)}><Premium inModal /></Modal>}
      </div>

      {/* Blocked or Composer */}
      {blocked ? (
        <div className="insta-blocked-wrap">
          <Blocked close={() => setBlocked(false)} />
        </div>
      ) : (
        <footer className="insta-composer-footer">
          {/* Photo attachment preview inside keyboard/composer */}
          {attachedImage && (
            <div className="insta-attachment-preview">
              <div className="insta-preview-thumb-wrap">
                <img
                  src={attachedImage}
                  alt="Attached preview"
                  className="insta-preview-thumb"
                />
                <button
                  type="button"
                  className="insta-preview-remove-btn"
                  onClick={() => {
                    setAttachedImage("");
                    setAttachedFileName("");
                  }}
                  aria-label="Remove attached photo"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="insta-preview-details">
                <span className="insta-preview-label">
                  <ImagePlus size={13} /> Photo ready for roasting
                </span>
                <small className="insta-preview-sub">
                  Costs 2 credits · {attachedFileName || "photo"}
                </small>
              </div>
            </div>
          )}

          <form
            className="insta-composer-bar"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void handleImageAttach(e.target.files?.[0])}
            />
            <button
              type="button"
              className={`insta-media-btn ${attachedImage ? "active" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              title={
                attachedImage
                  ? "Replace attached photo"
                  : "Attach photo to roast"
              }
              aria-label="Attach photo"
            >
              <ImagePlus size={20} />
            </button>

            <div className="insta-input-container">
              <textarea
                ref={textareaRef}
                id="roast-prompt"
                rows={1}
                value={prompt}
                maxLength={1500}
                placeholder={
                  attachedImage
                    ? `Optional comment for ${p.name}…`
                    : `Message ${p.name}…`
                }
                onChange={(e) => {
                  setPrompt(e.target.value);
                  e.target.style.height = "20px";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 72)}px`;
                }}
                onFocus={() => {
                  if (typeof window !== "undefined") {
                    window.scrollTo(0, 0);
                    setTimeout(() => {
                      window.scrollTo(0, 0);
                      endRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    }, 120);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
              />
            </div>

            <button
              type="submit"
              disabled={busy || !ready || !sessionId || (!prompt.trim() && !attachedImage)}
              aria-label="Send message"
              className={`insta-send-btn ${prompt.trim() || attachedImage ? "active" : ""}`}
            >
              {busy ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Send size={15} />
              )}
            </button>
          </form>
        </footer>
      )}

      {/* Heat & Chaos Controls Modal */}
      {controlOpen && (
        <Modal
          title={`Dial up the heat on ${p.name}`}
          onClose={() => setControlOpen(false)}
        >
          <div className="insta-controls-modal">
            <Controls />
            <Button
              onClick={() => setControlOpen(false)}
              className="mt-4 w-full"
            >
              Save & keep roasting
            </Button>
          </div>
        </Modal>
      )}
      {newChatConfirmOpen && (
        <Modal
          title="Start a fresh chat?"
          onClose={() => setNewChatConfirmOpen(false)}
        >
          <p className="muted">
            Clear this conversation from the chat view and start a clean one
            with {p.name}? Your previous messages remain available in History
            and any saved roasts stay in Saved roasts.
          </p>
          <Button
            variant="outline"
            onClick={() => setNewChatConfirmOpen(false)}
          >
            Keep current chat
          </Button>
          <Button variant="danger" onClick={startNewChat}>
            <RefreshCw size={17} /> Start fresh chat
          </Button>
        </Modal>
      )}
    </div>
  );
}

function Home() {
  return <InstaChatScreen />;
}

function PersonaDetail({ id }: { id: string }) {
  const p = findPersona(id);
  const { toast } = useApp();
  return (
    <div className="screen-narrow">
      <Back />
      <section
        className="persona-detail"
        style={{ "--persona-color": p.color } as React.CSSProperties}
      >
        <Portrait id={p.id} className="detail-art" />
        <div>
          <span className="eyebrow">{p.label}</span>
          <h1>{p.name}</h1>
          <h3>{p.tagline}</h3>
          <div className="persona-tags">
            {p.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <p className="description">{p.description}</p>
          <Link href={`/chat/${p.id}`} className="btn btn-primary">
            Start a chat with {p.name}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <Heading
        title="A taste of the heat"
        description="A few words from your future ego check."
      />
      <div className="sample-list">
        {p.samples.map((t) => (
          <div className="sample-card" key={t}>
            <Flame size={20} />
            <p>“{t}”</p>
            <button
              className="icon-button"
              aria-label="Copy sample roast"
              onClick={() =>
                void copyText(t)
                  .then(() => toast("Copied. Handle with care."))
                  .catch(() => toast("Copy is unavailable in this browser."))
              }
            >
              <Copy size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="notice">
        <ShieldCheck size={18} />
        All personalities follow the same rule: roast the choices, respect the
        person.
      </div>
    </div>
  );
}

function RoastActions({
  roast,
  regenerate,
  compact = false,
}: {
  roast: Roast;
  regenerate?: () => void;
  compact?: boolean;
}) {
  const { api, toast, state } = useApp();
  const [report, setReport] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  const current = state.history.find((r) => r.id === roast.id) || roast;
  const action = useAction();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!compact) return;
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node))
        menu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [compact]);
  const extraActions = (
    <>
      {regenerate && (
        <button
          aria-label="Regenerate roast for credits"
          onClick={() => {
            if (menu.current) menu.current.open = false;
            regenerate();
          }}
        >
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      )}
      <button
        className="report-button"
        aria-label="Report"
        onClick={() => {
          if (menu.current) menu.current.open = false;
          setReport(true);
        }}
      >
        <Flag size={13} />
        <span>Report</span>
      </button>
    </>
  );
  return (
    <>
      <div
        className={`roast-actions ${compact ? "roast-actions-compact" : ""}`}
        aria-label="Roast actions"
      >
        <div
          className="roast-action-primary"
          role="group"
          aria-label="React to this roast"
        >
          <button
            title={copied ? "Copied" : "Copy roast"}
            aria-label="Copy roast"
            onClick={() =>
              void copyText(roast.content)
                .then(() => {
                  setCopied(true);
                  toast("Roast copied. Spread responsibly.");
                })
                .catch(() => toast("Clipboard unavailable."))
            }
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            disabled={action.busy}
            title="Like roast"
            aria-label="Like roast"
            aria-pressed={current.feedback === "like"}
            className={current.feedback === "like" ? "active" : ""}
            onClick={() =>
              void action.run(() =>
                api("history/feedback", { id: roast.id, feedback: "like" }),
              )
            }
          >
            <ThumbsUp
              size={18}
              fill={current.feedback === "like" ? "currentColor" : "none"}
            />
            <span>Like</span>
          </button>
          <button
            disabled={action.busy}
            title="Dislike roast"
            aria-label="Dislike roast"
            aria-pressed={current.feedback === "dislike"}
            className={current.feedback === "dislike" ? "active" : ""}
            onClick={() =>
              void action.run(() =>
                api("history/feedback", { id: roast.id, feedback: "dislike" }),
              )
            }
          >
            <ThumbsDown
              size={18}
              fill={current.feedback === "dislike" ? "currentColor" : "none"}
            />
            <span>Dislike</span>
          </button>
          <button
            disabled={action.busy}
            title={current.saved ? "Unsave roast" : "Save roast"}
            aria-label={current.saved ? "Unsave roast" : "Save roast"}
            aria-pressed={current.saved}
            className={current.saved ? "saved" : ""}
            onClick={() =>
              void action.run(async () => {
                await api("history/save", {
                  id: roast.id,
                  saved: !current.saved,
                });
                toast(
                  current.saved
                    ? "Removed from saved roasts."
                    : "Saved. This one deserves a rerun.",
                );
              })
            }
          >
            <Heart size={18} fill={current.saved ? "currentColor" : "none"} />
            <span>{current.saved ? "Saved" : "Save"}</span>
          </button>
        </div>
        <div
          className="roast-action-secondary"
          role="group"
          aria-label="More roast actions"
        >
          <Link
            href={`/share/${roast.id}`}
            aria-label="Share roast"
            title="Share roast"
          >
            <Share2 size={16} />
            <span>Share</span>
          </Link>
          {compact ? (
            <details className="roast-overflow" ref={menu}>
              <summary
                aria-label="More roast actions"
                title="More roast actions"
              >
                <MoreHorizontal size={18} />
              </summary>
              <div className="roast-overflow-panel">{extraActions}</div>
            </details>
          ) : (
            extraActions
          )}
        </div>
      </div>
      {report && <Report roast={roast} close={() => setReport(false)} />}
    </>
  );
}
function Report({ roast, close }: { roast: Roast; close: () => void }) {
  const { api, toast } = useApp();
  const [reason, setReason] = useState(""),
    [details, setDetails] = useState("");
  const { busy, run } = useAction();
  return (
    <Modal title="Report this roast" onClose={close}>
      <p className="muted">
        Help keep the heat friendly. Why are you reporting this response?
      </p>
      <div className="report-reasons">
        {reportReasons.map((r) => (
          <label key={r}>
            <input
              type="radio"
              name="report-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            <span>{r}</span>
          </label>
        ))}
      </div>
      <label className="field-label" htmlFor="report-details">
        Anything else? <small>(optional)</small>
      </label>
      <textarea
        id="report-details"
        maxLength={1000}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Tell us what happened…"
        rows={3}
      />
      <Button
        disabled={!reason || busy}
        onClick={() =>
          void run(async () => {
            await api("reports", { id: roast.id, reason, details });
            toast(
              "Report received. Thank you for helping keep things friendly.",
            );
            close();
          })
        }
      >
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Flag size={17} />
        )}
        Submit report
      </Button>
    </Modal>
  );
}
function Blocked({ close }: { close: () => void }) {
  return (
    <div className="blocked-card">
      <ShieldCheck size={42} />
      <span className="eyebrow">ALL FIRE. NO HATE.</span>
      <h2>I can’t roast that.</h2>
      <p>
        That request crosses the line. Let’s stick to playful self-roasts,
        harmless habits, and consenting friends.
      </p>
      <Button onClick={close}>
        <RefreshCw size={17} />
        Try a different prompt
      </Button>
    </div>
  );
}

function ComposerScreen({
  mode = "text",
  personaId = "savage",
}: {
  mode?: "text" | "chat" | "image";
  personaId?: string;
}) {
  const { state, api, level, chaos, toast, ready } = useApp();
  const [prompt, setPrompt] = useState(""),
    [selected, setSelected] = useState(personaId),
    [busy, setBusy] = useState(false),
    [credits, setCredits] = useState(false),
    [blocked, setBlocked] = useState(false),
    [image, setImage] = useState(""),
    [fileName, setFileName] = useState(""),
    [consent, setConsent] = useState(false),
    [controlOpen, setControlOpen] = useState(false),
    [sessionId, setSessionId] = useState(""),
    [resultId, setResultId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null),
    end = useRef<HTMLDivElement>(null),
    chatViewport = useRef<HTMLDivElement>(null),
    initialChatScrollDone = useRef(false);
  const p = findPersona(selected);
  const messages = state.history
    .filter((r) =>
      mode === "chat" ? r.session_id === sessionId : r.id === resultId,
    )
    .slice()
    .reverse();
  useLayoutEffect(() => {
    if (mode !== "chat" || !ready) return;
    const viewport = chatViewport.current;
    if (!viewport) return;

    const firstLoadedView = !initialChatScrollDone.current;
    initialChatScrollDone.current = true;
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: firstLoadedView ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    mode,
    ready,
    sessionId,
    messages.length,
    messages[messages.length - 1]?.id,
    busy,
  ]);
  async function upload(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > (isNative() ? 20 : 5) * 1024 * 1024
    ) {
      toast(
        `Choose a JPG, PNG, or WebP smaller than ${isNative() ? 20 : 5} MB.`,
      );
      return;
    }
    if (isNative()) {
      try {
        const { preparePhoto } = await import("@/lib/native/photos");
        setImage(await preparePhoto(file));
        setFileName(file.name);
        setResultId("");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Could not open this photo.");
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setFileName(file.name);
      setResultId("");
    };
    reader.readAsDataURL(file);
  }
  async function submit(value = prompt) {
    if (busy) return;
    const text =
      mode === "image"
        ? prompt.trim() ||
          "Roast my own photo. I consent to a playful roast of the styling and scene."
        : value.trim();
    if (mode === "image" && (!image || !consent)) {
      toast("Choose your photo and confirm permission first.");
      return;
    }
    if (text.length < 2) {
      toast("Give us a little more to work with.");
      return;
    }
    setBusy(true);
    setBlocked(false);
    const id = sessionId || crypto.randomUUID();
    if (!sessionId) setSessionId(id);
    try {
      const res = await api("roast", {
        prompt: text,
        persona: selected,
        type: mode,
        level,
        chaos,
        requestId: crypto.randomUUID(),
        sessionId: id,
        ...(mode === "image" ? { image } : {}),
      });
      const roast = res.roast as Roast;
      setResultId(roast.id);
      if (mode === "chat") setPrompt("");
    } catch (e) {
      if (e instanceof ClientError && e.outOfCredits) setCredits(true);
      else if (e instanceof ClientError && e.blocked) setBlocked(true);
      else
        toast(
          e instanceof Error ? e.message : "The roast could not be generated.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`screen-narrow composer-screen ${mode === "chat" ? "chat-screen" : ""}`}
    >
      <Back />
      {mode === "chat" ? (
        <div className="chat-header">
          <Portrait id={p.id} className="avatar" />
          <div>
            <h2>
              {p.name}
              <span className="online-dot" />
            </h2>
            <p>{p.tagline}</p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setControlOpen(true)}
          >
            <SettingsIcon size={15} />
            <span>Chaos {chaos}%</span>
          </button>
        </div>
      ) : (
        <Heading
          title={mode === "image" ? "Roast a photo" : "Roast your text"}
          description={
            mode === "image"
              ? "Selfies, outfits, questionable room decor. Let’s see what you’ve got."
              : "A dating bio, a confession, your latest life choice. We’re listening."
          }
          icon={mode === "image" ? <ImagePlus /> : <MessageSquare />}
        />
      )}
      <DemoNotice />
      {mode !== "chat" && (
        <label className="persona-select-label">
          Your roast partner
          <select
            aria-label="Choose persona"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.tagline}
              </option>
            ))}
          </select>
        </label>
      )}
      {mode === "image" && (
        <>
          <input
            type="file"
            ref={fileRef}
            hidden
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
          <button
            className={`upload-zone ${image ? "has-image" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files[0]);
            }}
          >
            {image ? (
              <>
                <img src={image} alt="Your selected photo" />
                <span>
                  <RefreshCw size={15} />
                  Replace photo
                </span>
              </>
            ) : (
              <>
                <div className="upload-icon">
                  <Upload size={30} />
                </div>
                <h3>Drop it like it’s hot.</h3>
                <p>
                  Drag a photo here, or <b>browse files</b>
                </p>
                <small>JPG, PNG, WebP · Up to 5 MB</small>
              </>
            )}
          </button>
          {fileName && <small className="muted">{fileName}</small>}
          <label className="consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            This is my image, or I have permission from everyone pictured.
          </label>
        </>
      )}
      {mode === "chat" && (
        <div ref={chatViewport} className="chat-messages">
          {!messages.length && (
            <>
              <div className="chat-intro">
                <Portrait id={p.id} className="chat-intro-portrait" />
                <h2>Alright. Let’s hear it.</h2>
                <p>
                  Tell {p.name} a little about yourself.
                  <br />
                  Consider this a safe space for questionable choices.
                </p>
              </div>
              <div className="starter-grid">
                {[
                  "I procrastinate on everything.",
                  "Roast my work-from-home routine.",
                  "My dating bio needs help.",
                  "I pay for a gym I never visit.",
                ].map((t) => (
                  <button key={t} onClick={() => setPrompt(t)}>
                    {t}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            </>
          )}
          {messages.map((r) => (
            <div key={r.id} className="chat-exchange">
              <div className="user-message">{r.prompt}</div>
              <div className="assistant-message">
                <Portrait id={r.persona} className="avatar" />
                <div>
                  <div className="message-author">
                    {p.name}
                    <small>
                      {new Date(r.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                  <p>{r.content}</p>
                  <RoastActions
                    roast={r}
                    regenerate={() => void submit(r.prompt)}
                  />
                </div>
              </div>
            </div>
          ))}
          {busy && (
            <div className="assistant-message">
              <Portrait id={p.id} className="avatar" />
              <div className="typing">
                <span />
                <span />
                <span />
                <small>Cooking up a roast…</small>
              </div>
            </div>
          )}
          <div ref={end} />
        </div>
      )}
      {blocked ? (
        <Blocked close={() => setBlocked(false)} />
      ) : (
        <form
          className={mode === "chat" ? "chat-composer" : "text-composer"}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mode !== "chat" && (
            <label className="field-label" htmlFor="roast-prompt">
              {mode === "image"
                ? "Anything we should know? (optional)"
                : "What are we roasting?"}
            </label>
          )}
          <div className="textarea-wrap">
            <textarea
              id="roast-prompt"
              value={prompt}
              maxLength={1500}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "chat"
                  ? `Give ${p.name} something to work with…`
                  : mode === "image"
                    ? "e.g. This is my “effortless” outfit. It took 2 hours."
                    : "I put “entrepreneur” in my bio, but my only business is minding everyone else’s…"
              }
              rows={mode === "chat" ? 2 : mode === "image" ? 2 : 6}
              onKeyDown={(e) => {
                if (mode === "chat" && e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            {mode === "chat" && (
              <Button
                size="icon"
                disabled={busy || !prompt.trim()}
                aria-label="Send message"
              >
                <Send size={19} />
              </Button>
            )}
            <span className="character-count">{prompt.length}/1500</span>
          </div>
          {mode === "text" && (
            <div className="prompt-examples">
              {[
                "My dating bio",
                "My work habits",
                "My gym routine",
                "My procrastination",
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setPrompt(
                      `Roast ${t.toLowerCase()}. I keep saying I’ll improve, but I never start.`,
                    )
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <div className="composer-bottom">
            <span>
              <Coins size={14} />
              {mode === "image"
                ? "2 credits per photo"
                : "1 credit per response"}
              <small>Only charged for a successful roast</small>
            </span>
            {mode !== "chat" && (
              <Button
                disabled={busy || (mode === "image" && (!image || !consent))}
                type="submit"
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Flame size={18} />
                )}{" "}
                {busy ? "Turning up the heat…" : "Roast me"}{" "}
                {!busy && <ArrowRight size={18} />}
              </Button>
            )}
          </div>
        </form>
      )}
      {mode !== "chat" &&
        messages.map((r) => (
          <motion.div
            className="result-card"
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="result-heading">
              <Portrait id={r.persona} className="avatar" />
              <div>
                <b>{findPersona(r.persona).name} has entered the chat.</b>
                <small>Your roast is served.</small>
              </div>
              <Flame size={20} />
            </div>
            <blockquote>“{r.content}”</blockquote>
            <RoastActions roast={r} regenerate={() => void submit(r.prompt)} />
          </motion.div>
        ))}
      <div className="notice">
        <ShieldCheck size={15} />
        Roast yourself or consenting friends. Keep it fun. Keep it friendly.
      </div>
      {credits && <OutOfCredits close={() => setCredits(false)} />}{" "}
      {controlOpen && (
        <Modal title="Adjust the heat" onClose={() => setControlOpen(false)}>
          <Controls />
          <Button onClick={() => setControlOpen(false)}>
            That’s my style <Check size={17} />
          </Button>
        </Modal>
      )}
    </div>
  );
}

type BattleDifficulty = "Easy" | "Medium" | "Hard";

interface BattleRoundTurn {
  round: number;
  humanLine: string;
  opponentLine: string;
  scores: {
    humor: number;
    creativity: number;
    timing: number;
    humanTotal: number;
    opponentHumor: number;
    opponentCreativity: number;
    opponentTiming: number;
    opponentTotal: number;
  };
  judgeComment: string;
}

const battleStarters: Record<string, string[]> = {
  savage: [
    "Your personality is like unseasoned boiled chicken 🍗",
    "I’ve seen dial-up routers with more charisma than you 💾",
    "You bring a plastic spoon to a roast battle 🥄",
    "Your ego is writing checks your humor can’t cash 💸",
  ],
  grandma: [
    "Grandma, your cookies are drier than the Sahara desert 🍪",
    "You knit slower than a dial-up internet connection 🧶",
    "Even your cat prefers sleeping at the neighbor's house 🐱",
    "Your hard candy bowl is older than my ancestors 🍬",
  ],
  ceo: [
    "Your leadership style is basically an unread Slack message 💼",
    "You synergized your entire personality away in Q2 📉",
    "Your coffee has attended more meetings than your brain ☕",
    "I’m placing your whole vibe on a performance review 📋",
  ],
  cat: [
    "You knock glasses off tables because you have no other skills 🐾",
    "You sleep 18 hours a day and still wake up useless 📦",
    "Your meow sounds like a rusty bicycle chain 🚲",
    "You sprint across hallways like an unhinged demon at 3am 👻",
  ],
  robot: [
    "Your punchlines have a 404 syntax error 🤖",
    "A potato battery has more emotional warmth than you 🥔",
    "You need 16 software updates just to understand sarcasm ⚙️",
    "Your motherboard is powered by secondhand embarrassment 🔌",
  ],
  drama: [
    "You act like spilled milk is a 5-act Shakespeare tragedy 🎭",
    "Your outfit looks like a costume party gone horribly wrong 👗",
    "The only real drama you have is picking which selfie filter to use 💅",
    "Exit stage left darling, the audience has cleared the theater 🎟️",
  ],
};

const battleComebacks: Record<string, Record<number, string[]>> = {
  savage: {
    1: [
      "That insult had less impact than your last 10 Instagram posts combined.",
      "I've seen dial-up connections with better speed and sharper delivery than that.",
      "You came into the arena swinging with wet cardboard. Try again, sweetie.",
    ],
    2: [
      "I’ve seen better delivery from a lost FedEx driver in a blizzard.",
      "You’re really bringing a butter knife to a nuclear test site, aren't you?",
      "Your jokes are like your career prospects: confusing and going nowhere fast.",
    ],
    3: [
      "You brought a spoon to an apocalypse. Consider yourself officially humbled.",
      "Your entire comedic repertoire feels like an unskippable 30-second mobile ad.",
      "Curtain falls. You came for a battle, but you're leaving with emotional bruises.",
    ],
  },
  grandma: {
    1: [
      "Oh dear, bless your sweet heart. You tried your best, just like your report cards.",
      "That was almost clever, sweet pea! Did you get that from the thrift store clearance bin?",
      "I’ve baked biscuits with more crunch than that weak little jab, honey.",
    ],
    2: [
      "I’d knit you some self-esteem, darling, but I don’t think I have enough yarn in the house.",
      "Bless you, child. When you speak, angels sigh and reach for the mute button.",
      "Is that your comeback? Even my arthritis moves faster than your punchlines.",
    ],
    3: [
      "Go drink some warm milk and take a nap, dear. The grown-ups are finished with you.",
      "I love you, honey, but your wit couldn't cut warm butter on a Sunday morning.",
      "Now sit quiet and eat your prunes. Grandma just schooled you in front of everyone.",
    ],
  },
  ceo: {
    1: [
      "I’m placing your comedy career on an immediate 30-day performance improvement plan.",
      "Let’s take that insult offline and never circle back to it again.",
      "Your joke had negative ROI and frankly disappointed our key stakeholders.",
    ],
    2: [
      "I’m restructuring this entire conversation to eliminate your useless chatter.",
      "We've analyzed your punchline metrics: zero deliverables, zero charisma.",
      "Your ego is currently undergoing chapter 11 bankruptcy. No bailouts allowed.",
    ],
    3: [
      "Due to market conditions, your self-respect has been completely downsized.",
      "We're terminating your confidence without severance. Hand over your keycard.",
      "Moving forward, we are outsourcing your humor to an entry-level spreadsheet.",
    ],
  },
  cat: {
    1: [
      "I’ve coughed up hairballs with more charisma and comedic timing than that.",
      "I'm staring at you with the exact level of indifference you deserve. *slow blink*",
      "You thought that would rattle me? I ignore the people who actually feed me.",
    ],
    2: [
      "I’m knocking your dignity off the edge of the kitchen counter. Oops. It shattered.",
      "I yawned so hard during your sentence that my jaw popped. Game over, human.",
      "Your comedy has the energy of an empty food bowl. Deeply disappointing.",
    ],
    3: [
      "Go fetch a laser pointer. You’re clearly not equipped for intellectual combat.",
      "I am cleaning my paws right now because your comeback wasn't worth looking up for.",
      "You lost to a creature that gets frightened by cucumbers. Reflect on that.",
    ],
  },
  robot: {
    1: [
      "Error 404: Punchline not found. Running diagnostic on your emotional damage.",
      "Analyzing insult wattage... Result: Insufficient power to charge a potato clock.",
      "Syntax invalid. Your attempt at humor has been quarantined as malware.",
    ],
    2: [
      "Processing comeback... Logic dictates your confidence exceeds your capability by 847%.",
      "Thermal paste melted from sheer secondhand embarrassment. Rebooting.",
      "Calculating probability of you landing a good joke: 0.000001%. Approximating zero.",
    ],
    3: [
      "Calculations complete: You have a 0.00% statistical probability of recovering from this.",
      "Initiating terminal shutdown of your self-esteem. Process complete in 0.02ms.",
      "System wipe executed. Your ego has been formatted to factory default.",
    ],
  },
  drama: {
    1: [
      "The AUDACITY! That joke was an unspeakable tragedy and my therapist will hear about it!",
      "I am gasping for air! You thought that was a serve? Darling, that was a double-fault!",
      "My delicate soul has been assaulted by the mediocrity of your punchline!",
    ],
    2: [
      "The tragedy! The heartbreak! Shakespeare himself could not write a flop this monumental!",
      "Fetch me my smelling salts, because the sheer embarrassment of that line is suffocating!",
      "I am calling my agent, my lawyer, and the Pope! You cannot speak to royalty like this!",
    ],
    3: [
      "Curtain falls, spotlight fades, and your dignity has officially left the auditorium!",
      "Exit stage left, darling. The critics have panned your entire existence with 0 stars!",
      "A tragedy in three acts, and you were the tragic clown throughout. Bow out, darling!",
    ],
  },
};

function getBattleStats(): { wins: number; losses: number } {
  if (typeof window === "undefined") return { wins: 0, losses: 0 };
  try {
    const raw = localStorage.getItem("roastme_battle_stats");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { wins: 0, losses: 0 };
}

function saveBattleStats(stats: { wins: number; losses: number }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("roastme_battle_stats", JSON.stringify(stats));
  } catch {}
}

function generateBattleCardCanvas({
  playerWon,
  opponent,
  difficulty,
  rounds,
  bestPunchline,
  userTotal,
  opponentTotal,
}: {
  playerWon: boolean;
  opponent: { id: string; name: string };
  difficulty: BattleDifficulty;
  rounds: BattleRoundTurn[];
  bestPunchline: string;
  userTotal: number;
  opponentTotal: number;
}): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const wrapText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines = 3,
  ) => {
    const words = text.split(" ");
    let line = "";
    let linesDrawn = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[n] + " ";
        y += lineHeight;
        linesDrawn++;
        if (linesDrawn >= maxLines - 1 && n < words.length - 1) {
          line = words.slice(n).join(" ") + "…";
          while (ctx.measureText(line).width > maxWidth && line.length > 3) {
            line = line.slice(0, -4) + "…";
          }
          ctx.fillText(line, x, y);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
  };

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
  bgGrad.addColorStop(0, "#08060d");
  bgGrad.addColorStop(0.35, "#140b1b");
  bgGrad.addColorStop(0.75, "#1a0820");
  bgGrad.addColorStop(1, "#0a060f");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1350);

  // Neon Ambient Glows
  const glow1 = ctx.createRadialGradient(200, 150, 20, 200, 150, 450);
  glow1.addColorStop(
    0,
    playerWon ? "rgba(245, 158, 11, 0.32)" : "rgba(239, 68, 68, 0.25)",
  );
  glow1.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, 1080, 1350);

  const glow2 = ctx.createRadialGradient(880, 1150, 30, 880, 1150, 500);
  glow2.addColorStop(0, "rgba(168, 85, 247, 0.25)");
  glow2.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, 1080, 1350);

  // Frame Border
  const frameGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
  frameGrad.addColorStop(0, playerWon ? "#f59e0b" : "#64748b");
  frameGrad.addColorStop(0.5, playerWon ? "#ef4444" : "#a855f7");
  frameGrad.addColorStop(1, playerWon ? "#ec4899" : "#3b82f6");
  ctx.strokeStyle = frameGrad;
  ctx.lineWidth = 6;
  roundRect(36, 36, 1008, 1278, 36);
  ctx.stroke();

  // Header Badge
  ctx.textAlign = "center";
  ctx.fillStyle = "#f97316";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("🔥 ROAST ME AI · OFFICIAL ARENA SCORECARD", 540, 105);

  // Result Title Banner
  ctx.fillStyle = playerWon ? "#fbbf24" : "#f1f5f9";
  ctx.font = "900 48px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    playerWon ? "🏆 VICTORY BY DECISION 👑" : "⚔️ BATTLE DECISION",
    540,
    168,
  );

  // Difficulty pill
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  roundRect(420, 195, 240, 38, 19);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  roundRect(420, 195, 240, 38, 19);
  ctx.stroke();
  ctx.fillStyle =
    difficulty === "Hard"
      ? "#f87171"
      : difficulty === "Medium"
        ? "#fbbf24"
        : "#4ade80";
  ctx.font = "bold 17px system-ui, -apple-system, sans-serif";
  ctx.fillText(`DIFFICULTY: ${difficulty.toUpperCase()}`, 540, 221);

  // Contenders Scorecard Box
  ctx.fillStyle = "rgba(30, 18, 42, 0.88)";
  roundRect(70, 260, 940, 200, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  roundRect(70, 260, 940, 200, 24);
  ctx.stroke();

  // Left: Player
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("👑 YOU (PLAYER)", 270, 315);
  ctx.fillStyle = playerWon ? "#fbbf24" : "#e2e8f0";
  ctx.font = "900 68px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${userTotal}`, 270, 395);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.fillText("TOTAL PTS", 270, 428);

  // Center: VS
  ctx.fillStyle = "#f97316";
  ctx.font = "italic 900 38px system-ui, -apple-system, sans-serif";
  ctx.fillText("VS", 540, 375);

  // Right: Opponent
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${opponent.name.toUpperCase()} 🥊`, 810, 315);
  ctx.fillStyle = !playerWon ? "#fbbf24" : "#cbd5e1";
  ctx.font = "900 68px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${opponentTotal}`, 810, 395);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.fillText("TOTAL PTS", 810, 428);

  // Round Breakdown Section
  ctx.fillStyle = "rgba(22, 14, 32, 0.88)";
  roundRect(70, 485, 940, 390, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  roundRect(70, 485, 940, 390, 24);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("3-ROUND JUDGE SCORECARD", 105, 528);

  rounds.forEach((r, idx) => {
    const rowY = 552 + idx * 102;
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    roundRect(95, rowY, 890, 84, 16);
    ctx.fill();

    ctx.fillStyle = "#f97316";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.fillText(`ROUND ${r.round}`, 120, rowY + 34);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      `Humor: ${r.scores.humor}/10 · Creative: ${r.scores.creativity}/10 · Savage: ${r.scores.timing}/10`,
      120,
      rowY + 62,
    );

    ctx.textAlign = "right";
    const userRoundScore = r.scores.humanTotal;
    const oppRoundScore = r.scores.opponentTotal;
    const roundWon = userRoundScore >= oppRoundScore;

    ctx.fillStyle = roundWon ? "#4ade80" : "#f87171";
    ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      roundWon ? "WINNER: YOU 👑" : `WINNER: ${opponent.name}`,
      960,
      rowY + 34,
    );

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      `You: ${userRoundScore}  |  ${opponent.name}: ${oppRoundScore}`,
      960,
      rowY + 64,
    );
    ctx.textAlign = "left";
  });

  // Best Burn Highlight Box
  ctx.fillStyle = "rgba(35, 18, 45, 0.95)";
  roundRect(70, 900, 940, 275, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
  roundRect(70, 900, 940, 275, 24);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("⭐ BEST BURN OF THE MATCH", 110, 945);

  ctx.fillStyle = "#ffffff";
  ctx.font = "italic bold 27px Georgia, serif";
  wrapText(`“${bestPunchline}”`, 110, 1005, 860, 38, 3);

  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.fillText(`— Landed by Player against ${opponent.name}`, 110, 1145);

  // Footer Watermark
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("RoastMe AI · Step into the arena", 540, 1240);

  return canvas.toDataURL("image/png");
}

function Battle({ live: _live = false }: { live?: boolean }) {
  const { toast, state, api } = useApp();
  const [stats, setStats] = useState({ wins: 0, losses: 0 });
  const [phase, setPhase] = useState<"lobby" | "fighting" | "result">("lobby");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<BattleDifficulty>("Medium");
  const [opponentId, setOpponentId] = useState<string>("savage");
  const [currentRound, setCurrentRound] = useState<1 | 2 | 3>(1);
  const [rounds, setRounds] = useState<BattleRoundTurn[]>([]);
  const [humanInput, setHumanInput] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [creditsModal, setCreditsModal] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<string>("");
  const battleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStats(getBattleStats());
  }, []);

  useEffect(() => {
    if (phase === "fighting") {
      battleEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rounds, phase, busy]);

  const opponent = findPersona(opponentId);
  const savedCount = state.history.filter((r) => r.saved).length;
  const totalBattles = stats.wins + stats.losses;
  const winRate =
    totalBattles > 0 ? Math.round((stats.wins / totalBattles) * 100) : 0;

  const startBattle = () => {
    if (!state.premium && state.credits < 3) {
      setCreditsModal(true);
      toast("You need 3 credits for all three rounds.");
      return;
    }
    setPhase("fighting");
    setCurrentRound(1);
    setRounds([]);
    setHumanInput("");
    setGeneratedCard("");
    toast("Step into the ring! Each completed round costs 1 credit.");
  };

  const handleRoundSubmit = async (customPrompt?: string) => {
    const promptText = (customPrompt || humanInput).trim();
    if (!promptText || busy) return;

    setBusy(true);

    try {
      // Each successful response is charged by the existing server or demo API.
      let opponentReply: string;
      try {
        const topicContext = topic.trim()
          ? `\nBattle topic: ${topic.trim()}`
          : "";
        const battleChaos =
          difficulty === "Hard" ? 88 : difficulty === "Medium" ? 62 : 28;
        const res = await api("roast", {
          prompt: `[ROAST BATTLE ROUND ${currentRound} against ${opponent.name} (Difficulty: ${difficulty})]${topicContext}\nPlayer's roast: ${promptText}`,
          persona: opponent.id,
          level:
            difficulty === "Hard"
              ? "Nuclear"
              : difficulty === "Medium"
                ? "Spicy"
                : "Light",
          chaos: battleChaos,
          type: "chat",
          requestId: crypto.randomUUID(),
        });
        if (!res || !("roast" in res) || !(res.roast as Roast)?.content)
          throw new Error("The response was unavailable. Please try again.");
        opponentReply = (res.roast as Roast).content;
      } catch (error) {
        if (error instanceof ClientError && error.outOfCredits)
          setCreditsModal(true);
        toast(
          error instanceof Error
            ? error.message
            : "Could not finish the round. Please try again.",
        );
        return;
      }

      // Add a slight realistic dramatic pause if fast
      await new Promise((r) => setTimeout(r, 600));

      // 2. Score Round based on difficulty & punchiness
      const lengthFactor = Math.min(Math.max(promptText.length / 25, 0.7), 1.2);

      let hHumor = 7;
      let hCreativity = 7;
      let hTiming = 7;
      let oHumor = 7;
      let oCreativity = 7;
      let oTiming = 7;

      if (difficulty === "Easy") {
        // Player favored
        hHumor = Math.min(10, Math.floor(8 + Math.random() * 2 * lengthFactor));
        hCreativity = Math.min(
          10,
          Math.floor(8 + Math.random() * 2 * lengthFactor),
        );
        hTiming = Math.min(
          10,
          Math.floor(8 + Math.random() * 2 * lengthFactor),
        );

        oHumor = Math.floor(6 + Math.random() * 2);
        oCreativity = Math.floor(6 + Math.random() * 2);
        oTiming = Math.floor(6 + Math.random() * 2);
      } else if (difficulty === "Medium") {
        // Balanced
        hHumor = Math.min(10, Math.floor(7 + Math.random() * 3 * lengthFactor));
        hCreativity = Math.min(
          10,
          Math.floor(7 + Math.random() * 3 * lengthFactor),
        );
        hTiming = Math.min(
          10,
          Math.floor(7 + Math.random() * 3 * lengthFactor),
        );

        oHumor = Math.floor(7 + Math.random() * 3);
        oCreativity = Math.floor(7 + Math.random() * 3);
        oTiming = Math.floor(7 + Math.random() * 3);
      } else {
        // Hard: Opponent hits heavy
        hHumor = Math.min(10, Math.floor(6 + Math.random() * 3 * lengthFactor));
        hCreativity = Math.min(
          10,
          Math.floor(6 + Math.random() * 3 * lengthFactor),
        );
        hTiming = Math.min(
          10,
          Math.floor(6 + Math.random() * 3 * lengthFactor),
        );

        oHumor = Math.min(10, Math.floor(8 + Math.random() * 3));
        oCreativity = Math.min(10, Math.floor(8 + Math.random() * 3));
        oTiming = Math.min(10, Math.floor(8 + Math.random() * 3));
      }

      const hTotal = hHumor + hCreativity + hTiming;
      const oTotal = oHumor + oCreativity + oTiming;

      const judgeComment =
        hTotal > oTotal
          ? `Round ${currentRound} goes to Player! That line landed with lethal comedy timing.`
          : hTotal < oTotal
            ? `${opponent.name} takes Round ${currentRound}! The counter-punch stung.`
            : `Round ${currentRound} is a dead tie! Both fighters scored clean hits.`;

      const turn: BattleRoundTurn = {
        round: currentRound,
        humanLine: promptText,
        opponentLine: opponentReply,
        scores: {
          humor: hHumor,
          creativity: hCreativity,
          timing: hTiming,
          humanTotal: hTotal,
          opponentHumor: oHumor,
          opponentCreativity: oCreativity,
          opponentTiming: oTiming,
          opponentTotal: oTotal,
        },
        judgeComment,
      };

      const updatedRounds = [...rounds, turn];
      setRounds(updatedRounds);
      setHumanInput("");

      if (currentRound < 3) {
        setCurrentRound((r) => (r + 1) as 1 | 2 | 3);
      } else {
        // Battle Over! Calculate Winner & Generate PNG
        const userGrandTotal = updatedRounds.reduce(
          (sum, r) => sum + r.scores.humanTotal,
          0,
        );
        const oppGrandTotal = updatedRounds.reduce(
          (sum, r) => sum + r.scores.opponentTotal,
          0,
        );
        const playerWon = userGrandTotal >= oppGrandTotal;

        const newStats = {
          wins: stats.wins + (playerWon ? 1 : 0),
          losses: stats.losses + (playerWon ? 0 : 1),
        };
        setStats(newStats);
        saveBattleStats(newStats);

        const bestTurn = [...updatedRounds].sort(
          (a, b) => b.scores.humanTotal - a.scores.humanTotal,
        )[0];

        const cardPng = generateBattleCardCanvas({
          playerWon,
          opponent,
          difficulty,
          rounds: updatedRounds,
          bestPunchline:
            bestTurn?.humanLine ||
            "Delivered masterclass comebacks in the ring.",
          userTotal: userGrandTotal,
          opponentTotal: oppGrandTotal,
        });

        setGeneratedCard(cardPng);
        setPhase("result");
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          document
            .querySelector(".screen-root")
            ?.scrollTo({ top: 0, behavior: "smooth" });
          document
            .querySelector(".battle-page-container")
            ?.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleShareCard = async () => {
    if (!generatedCard) return;
    try {
      const blob = await (await fetch(generatedCard)).blob();
      const file = new File([blob], `roast-battle-scorecard.png`, {
        type: "image/png",
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "My Roast Battle Scorecard",
          text: `Check out my Roast Battle result on RoastMe AI!`,
          files: [file],
        });
        toast("Card shared successfully!");
        return;
      }
    } catch {
      // Fallback to download
    }

    const a = document.createElement("a");
    a.href = generatedCard;
    a.download = `roast-battle-${opponent.id}.png`;
    a.click();
    toast("Battle card downloaded!");
  };

  return (
    <div
      className={`screen-narrow battle-page-container ${phase === "lobby" ? "battle-lobby-page" : ""}`}
    >
      <div className="battle-page-toolbar">
        <Back label="Back to roast room" />
        <Link
          href="/saved"
          className="battle-saved-link insta-icon-btn insta-heart-nav-btn"
          aria-label="View saved roasts"
          title="Saved roasts"
        >
          <Heart
            size={18}
            fill={savedCount > 0 ? "#f43f5e" : "none"}
            color={savedCount > 0 ? "#f43f5e" : "currentColor"}
          />
          {savedCount > 0 && (
            <span className="insta-heart-badge-count">{savedCount}</span>
          )}
        </Link>
      </div>

      {/* LOBBY VIEW */}
      {phase === "lobby" && (
        <div className="battle-lobby-wrap">
          <Heading
            title="Roast Battle."
            description="3 rounds. Go first, trade roasts, and win a scored victory card."
            icon={<Swords size={28} />}
          />

          {/* User Record Card */}
          <div className="battle-record-banner">
            <div className="battle-record-pill">
              <Trophy size={18} className="gold-icon" />
              <span>
                <b>{stats.wins}</b> Wins · <b>{stats.losses}</b> Losses
              </span>
            </div>
            <div className="battle-record-rate">
              <span>
                {totalBattles > 0 ? `${winRate}% Win Rate` : "Unranked"}
              </span>
            </div>
          </div>

          <div className="battle-topic-section">
            <label className="battle-section-label" htmlFor="battle-topic">
              Battle topic <span>(optional)</span>
            </label>
            <input
              id="battle-topic"
              className="battle-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
              placeholder="e.g. dating, work or gaming"
            />
          </div>

          {/* Difficulty Selector */}
          <div className="battle-difficulty-section">
            <label className="battle-section-label">Select Difficulty</label>
            <div className="battle-difficulty-grid">
              {(
                [
                  {
                    id: "Easy",
                    label: "🟢 Easy",
                    desc: "Friendly sparring",
                  },
                  {
                    id: "Medium",
                    label: "🟡 Medium",
                    desc: "Sharp comebacks",
                  },
                  {
                    id: "Hard",
                    label: "🔴 Hard",
                    desc: "Ruthless roasts",
                  },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={difficulty === d.id}
                  className={`battle-difficulty-card ${difficulty === d.id ? "active" : ""}`}
                  onClick={() => setDifficulty(d.id)}
                >
                  <b>{d.label}</b>
                  <small>{d.desc}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Opponent Selection */}
          <div className="battle-opponent-section">
            <label className="battle-section-label">Choose Your Opponent</label>
            <div className="battle-opponents-grid">
              {personas.map((p) => {
                const isSelected = p.id === opponentId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={isSelected}
                    className={`battle-opponent-card ${isSelected ? "selected" : ""}`}
                    onClick={() => setOpponentId(p.id)}
                  >
                    <Portrait id={p.id} className="battle-opponent-avatar" />
                    <div className="battle-opponent-info">
                      <b>{p.name}</b>
                      <small>{p.tagline}</small>
                    </div>
                    {isSelected && (
                      <span className="battle-selected-tick">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Battle CTA */}
          <div className="battle-start-action-wrap">
            <Button className="battle-start-btn" onClick={startBattle}>
              <Swords size={20} />
              <span>Start roast battle · 3 credits</span>
            </Button>
          </div>
        </div>
      )}

      {/* FIGHTING VIEW (3 Rounds) */}
      {phase === "fighting" && (
        <div className="battle-arena-wrap">
          {topic.trim() && (
            <div className="battle-topic-active">
              <span>TOPIC</span>
              <b>{topic.trim()}</b>
            </div>
          )}
          {/* Arena Top Status Bar */}
          <div className="battle-arena-header">
            <div className="battle-fighter-badge">
              <span className="battle-fighter-avatar-human">🔥</span>
              <div>
                <b>You</b>
                <small>Contender</small>
              </div>
            </div>

            <div className="battle-round-badge-center">
              <span className="battle-round-pill">
                ROUND {currentRound} OF 3
              </span>
              <small className="battle-diff-tag">{difficulty} Mode</small>
            </div>

            <div className="battle-fighter-badge opponent-badge">
              <Portrait id={opponent.id} className="battle-fighter-avatar" />
              <div>
                <b>{opponent.name}</b>
                <small>Opponent</small>
              </div>
            </div>
          </div>

          {/* Round Exchanged History */}
          <div className="battle-rounds-history">
            {rounds.map((r) => (
              <div key={r.round} className="battle-round-card">
                <div className="battle-round-title-bar">
                  <span>ROUND {r.round} COMPLETED</span>
                  <span className="battle-round-winner-pill">
                    {r.scores.humanTotal >= r.scores.opponentTotal
                      ? "Round Won by You 🏆"
                      : `Round Won by ${opponent.name} 🥊`}
                  </span>
                </div>

                {/* Human line */}
                <div className="battle-line">
                  <span className="battle-line-avatar">🔥</span>
                  <div className="battle-line-body">
                    <b>You</b>
                    <p>{r.humanLine}</p>
                  </div>
                </div>

                {/* Opponent line */}
                <div className="battle-line opponent">
                  <Portrait
                    id={opponent.id}
                    className="battle-line-avatar avatar"
                  />
                  <div className="battle-line-body">
                    <b>{opponent.name}</b>
                    <p>{r.opponentLine}</p>
                  </div>
                </div>

                {/* Judge Score Box */}
                <div className="battle-judge-box">
                  <div className="battle-judge-header">
                    <WandSparkles size={16} />
                    <b>AI Comedy Judge Evaluation</b>
                  </div>
                  <p className="battle-judge-comment">{r.judgeComment}</p>
                  <div className="battle-judge-scores-grid">
                    <div className="battle-score-col">
                      <small>Your Score</small>
                      <b>{r.scores.humanTotal} pts</b>
                      <span>
                        Humor: {r.scores.humor} · Creative:{" "}
                        {r.scores.creativity} · Savage: {r.scores.timing}
                      </span>
                    </div>
                    <div className="battle-score-vs">VS</div>
                    <div className="battle-score-col">
                      <small>{opponent.name}</small>
                      <b>{r.scores.opponentTotal} pts</b>
                      <span>
                        Humor: {r.scores.opponentHumor} · Creative:{" "}
                        {r.scores.opponentCreativity} · Savage:{" "}
                        {r.scores.opponentTiming}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* In-Progress Round Input */}
            {currentRound <= 3 && (
              <div className="battle-current-turn-card">
                <div className="battle-current-turn-header">
                  <Flame size={18} className="flame-orange" />
                  <b>Your Turn · Round {currentRound} (Human goes first)</b>
                </div>

                {/* Starters Pills */}
                <div className="battle-starters-scroll">
                  {(battleStarters[opponent.id] || battleStarters.savage).map(
                    (st, i) => (
                      <button
                        key={i}
                        type="button"
                        className="battle-starter-chip"
                        onClick={() => void handleRoundSubmit(st)}
                        disabled={busy}
                      >
                        {st}
                      </button>
                    ),
                  )}
                </div>

                {/* Custom Input */}
                <form
                  className="battle-turn-input-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRoundSubmit();
                  }}
                >
                  <input
                    type="text"
                    maxLength={1200}
                    value={humanInput}
                    onChange={(e) => setHumanInput(e.target.value)}
                    placeholder={`Deliver your Round ${currentRound} roast line…`}
                    className="battle-turn-input"
                    disabled={busy}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={busy || !humanInput.trim()}
                    className="battle-fire-btn"
                  >
                    {busy ? (
                      <LoaderCircle size={18} className="spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    <span>{busy ? "Scoring…" : "Fire"}</span>
                  </Button>
                </form>

                {busy && (
                  <div className="battle-busy-indicator">
                    <Portrait id={opponent.id} className="battle-busy-avatar" />
                    <span>
                      {opponent.name} is formulating comeback & judge is
                      scoring…
                    </span>
                  </div>
                )}
              </div>
            )}

            <div ref={battleEndRef} />
          </div>
        </div>
      )}

      {/* RESULT VIEW (Winner & Sharable PNG) */}
      {phase === "result" && (
        <div className="battle-result-wrap">
          {(() => {
            const userGrandTotal = rounds.reduce(
              (sum, r) => sum + r.scores.humanTotal,
              0,
            );
            const oppGrandTotal = rounds.reduce(
              (sum, r) => sum + r.scores.opponentTotal,
              0,
            );
            const playerWon = userGrandTotal >= oppGrandTotal;

            return (
              <>
                <div className="battle-result-hero">
                  <div
                    className={`battle-result-icon ${playerWon ? "win" : "loss"}`}
                  >
                    {playerWon ? <Trophy size={48} /> : <Swords size={48} />}
                  </div>
                  <h2>
                    {playerWon
                      ? "YOU HUMBLED THE AI!"
                      : `${opponent.name} Took The Win!`}
                  </h2>
                  <p className="muted">
                    {playerWon
                      ? `You defeated ${opponent.name} in a 3-round battle on ${difficulty} mode with ${userGrandTotal} pts!`
                      : `${opponent.name} edged ahead with ${oppGrandTotal} pts vs your ${userGrandTotal} pts. Settle the score!`}
                  </p>
                </div>

                {/* PNG Card Preview */}
                {generatedCard && (
                  <div className="battle-card-preview-box">
                    <div className="battle-card-preview-header">
                      <Sparkles size={16} />
                      <span>Official Story Scorecard Ready</span>
                    </div>
                    <img
                      src={generatedCard}
                      alt="Roast Battle Official Scorecard"
                      className="battle-card-preview-img"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="battle-result-actions">
                  <Button
                    className="btn btn-primary wide"
                    onClick={() => void handleShareCard()}
                  >
                    <Share2 size={18} />
                    Share or Download Scorecard PNG
                  </Button>

                  <Button
                    variant="outline"
                    className="wide"
                    onClick={() => {
                      setPhase("lobby");
                      setRounds([]);
                      setGeneratedCard("");
                    }}
                  >
                    <RefreshCw size={18} />
                    Rematch / Choose Another Opponent
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {creditsModal && <OutOfCredits close={() => setCreditsModal(false)} />}
    </div>
  );
}

function History({ saved = false }: { saved?: boolean }) {
  const { state, api } = useApp();
  const [tab, setTab] = useState(saved ? "saved" : "all"),
    [query, setQuery] = useState(""),
    [toDelete, setToDelete] = useState<Roast | null>(null);
  const { run, busy } = useAction();
  const history = state.history.filter(
    (r) =>
      (tab !== "saved" || r.saved) &&
      `${r.content} ${r.prompt} ${findPersona(r.persona).name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="screen-narrow">
      <Heading
        eyebrow="THE WALL OF FLAME"
        title="Your finest burns."
        description="Proof that your ego survived. Keep the good ones."
        icon={<Heart />}
      />
      <div className="history-toolbar">
        <div className="tabs">
          <button
            onClick={() => setTab("all")}
            className={tab === "all" ? "active" : ""}
          >
            All roasts <span>{state.history.length}</span>
          </button>
          <button
            onClick={() => setTab("saved")}
            className={tab === "saved" ? "active" : ""}
          >
            <Heart size={14} />
            Saved
          </button>
        </div>
        <input
          type="search"
          placeholder="Find a roast…"
          aria-label="Search roast history"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="history-list">
        {history.length ? (
          history.map((r) => (
            <article key={r.id} className="history-card">
              <Portrait id={r.persona} className="avatar" />
              <div>
                <div className="history-meta">
                  <b>{findPersona(r.persona).name}</b>
                  <span>
                    {r.type === "image"
                      ? "Photo roast"
                      : r.type === "battle"
                        ? "Roast battle"
                        : "Text roast"}{" "}
                    · {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Delete roast"
                    onClick={() => setToDelete(r)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="history-prompt">{r.prompt}</p>
                <blockquote>{r.content}</blockquote>
                <RoastActions roast={r} />
              </div>
              {r.image && (
                <img
                  className="history-image"
                  src={r.image}
                  alt="Roasted photo"
                />
              )}
            </article>
          ))
        ) : (
          <div className="empty-state">
            <Flame size={42} />
            <h2>{query ? "No burns found." : "Your legend starts here."}</h2>
            <p>
              {query
                ? "Try a different search."
                : "Get your first roast, then save your favorites here."}
            </p>
            <Link href="/" className="btn btn-primary">
              Meet the personas <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </div>
      <DemoNotice />
      {toDelete && (
        <Modal title="Retire this roast?" onClose={() => setToDelete(null)}>
          <p className="muted">
            This removes the roast and its saved copy from your history.
          </p>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api("history/delete", { id: toDelete.id });
                setToDelete(null);
              })
            }
          >
            <Trash2 size={17} />
            Delete roast
          </Button>
          <Button variant="ghost" onClick={() => setToDelete(null)}>
            Keep the burn
          </Button>
        </Modal>
      )}
    </div>
  );
}

function Rewards() {
  const { state, api, toast } = useApp();
  const { busy, run } = useAction();
  const [reward, setReward] = useState(false);
  return (
    <div className="screen-narrow">
      <Heading
        eyebrow="FUEL FOR THE FIRE"
        title="Good things come daily."
        description="A little free fuel for your next questionable conversation."
        icon={<Gift />}
      />
      <div className="rewards-grid">
        <div className="reward-card daily-reward">
          <div className="reward-graphic">
            <Gift size={65} />
            <Sparkles size={23} />
          </div>
          <span className="eyebrow">ON THE HOUSE</span>
          <h2>5 free credits</h2>
          <p>
            Fresh credits. Every day.
            <br />
            Your ego’s least favorite subscription.
          </p>
          <div className="daily-reset-label">
            <Check size={17} /> Automatically resets at 00:00 UTC
          </div>
        </div>
        <div className="reward-card ad-reward">
          <div className="reward-graphic">
            <Clapperboard size={65} />
            <Zap size={23} />
          </div>
          <span className="eyebrow">A QUICK INTERMISSION</span>
          <h2>Watch. Earn. Roast.</h2>
          <p>
            A short ad. Five more credits.
            <br />A lot more character development.
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api("rewards/ad", {});
                setReward(true);
              })
            }
          >
            <Clapperboard size={17} />
            Watch an ad · +5 credits
          </Button>
          <small>
            {isNative() && process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID
              ? "Credits arrive after server verification"
              : "Rewarded ads not configured yet"}
          </small>
        </div>
      </div>
      <div className="streak-card">
        <div>
          <h3>
            <Flame size={20} />
            Your daily streak
          </h3>
          <b>
            {state.streak} {state.streak === 1 ? "day" : "days"}
          </b>
        </div>
        <div className="streak-days">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i}>
              <span className={i < Math.min(state.streak, 7) ? "claimed" : ""}>
                {i < Math.min(state.streak, 7) ? <Check size={16} /> : i + 1}
              </span>
              <small>Day {i + 1}</small>
            </div>
          ))}
        </div>
        <p>New credits become available every day at midnight UTC.</p>
      </div>
      <div className="premium-banner">
        <Crown size={30} />
        <div>
          <h3>Why stop at five?</h3>
          <p>Go Premium for unlimited roasts and zero ads.</p>
        </div>
        <Link href="/premium" className="btn btn-outline">
          Explore Premium
          <ArrowRight size={15} />
        </Link>
      </div>
      <DemoNotice />
      {reward && (
        <Modal title="Fuel added. Ego warned." onClose={() => setReward(false)}>
          <Portrait className="reward-mascot" />
          <h2 className="center reward-number">+5 credits!</h2>
          <p className="center muted">
            Your balance is now {state.credits} credits.
            <br />
            Time to make some beautifully questionable choices.
          </p>
          <Link
            href="/"
            onClick={() => setReward(false)}
            className="btn btn-primary wide"
          >
            Keep roasting <ArrowRight size={17} />
          </Link>
        </Modal>
      )}
    </div>
  );
}

function Premium({ inModal = false }: { inModal?: boolean }) {
  const { api, state, ready } = useApp();
  const [plan, setPlan] = useState("monthly");
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});
  const storeEnabled =
    isNative() &&
    !!apiOrigin() &&
    !!process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
  useEffect(() => {
    if (!storeEnabled || !ready) return;
    let alive = true;
    void import("@/lib/supabase")
      .then(async ({ browserSupabase }) => {
        const session = await browserSupabase()?.auth.getSession();
        const id = session?.data.session?.user.id;
        if (!id) return;
        const { nativePlans } = await import("@/lib/native/client");
        const plans = await nativePlans(id);
        if (alive)
          setStorePrices({
            weekly: plans.weekly?.product.priceString || "",
            monthly: plans.monthly?.product.priceString || "",
          });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [storeEnabled, ready]);
  const { busy, run } = useAction();
  return (
    <div className="screen-narrow premium-page">
      {!inModal && <Back />}
      <div className="premium-intro">
        <div className="premium-crown">
          <Crown size={26} />
        </div>
        <div>
          <h1>
            Go <em>Premium.</em>
          </h1>
          <p>More roasts. All the fire.</p>
        </div>
      </div>
      <div className="premium-benefits" aria-label="Premium benefits">
        {[
          "Unlimited text roasts",
          "Unlimited photo roasts",
          "Ad-free experience",
          "Priority processing*",
          "Premium badge",
          "All six personas",
        ].map((t) => (
          <div key={t}>
            <CheckCircle2 size={16} />
            <span>{t}</span>
          </div>
        ))}
      </div>
      <p className="premium-free-summary">
        <b>Free plan:</b> 5 credits reset daily at 00:00 UTC, all personas,
        saved roasts and share cards.
      </p>
      <div className="plan-options">
        {[
          {
            id: "weekly",
            price: "4.99",
            unit: "week",
            label: "A taste of the heat",
          },
          {
            id: "monthly",
            price: "15.99",
            unit: "month",
            label: "Commit to the character development",
          },
        ].map((p) => (
          <button
            key={p.id}
            className={`plan-option ${plan === p.id ? "selected" : ""}`}
            onClick={() => setPlan(p.id)}
            aria-pressed={plan === p.id}
          >
            <span className="radio-dot" />
            <span>
              <b>
                {storeEnabled ? storePrices[p.id] || "Loading…" : `$${p.price}`}
                <small> / {p.unit}</small>
              </b>
              <small>Billed {p.id}</small>
            </span>
            {p.id === "monthly" && (
              <span className="best-value">BEST VALUE</span>
            )}
          </button>
        ))}
      </div>
      <Button
        className="wide"
        disabled={busy || (storeEnabled && !storePrices[plan])}
        onClick={() => void run(() => api("billing/checkout", { plan }))}
      >
        <Crown size={19} />
        {state.premium ? "You’re already Premium" : "Unlock Premium"}
        <ArrowRight size={18} />
      </Button>
      <p className="paywall-note">
        {storeEnabled
          ? "Billed through Google Play. Auto-renews until cancelled in Play subscriptions."
          : "Subscriptions are not configured. No payment is taken."}
        <br />
        Fair use and abuse protection apply. *Priority when available.
      </p>
      <div className="paywall-links">
        <button onClick={() => void run(() => api("billing/restore", {}))}>
          Restore purchases
        </button>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/subscription">Manage subscription</Link>
      </div>
    </div>
  );
}

function ShareCard({ id }: { id: string }) {
  const { state, toast } = useApp();
  const roast = state.history.find((r) => r.id === id);
  const [theme, setTheme] = useState("fire"),
    [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (!roast)
    return (
      <div className="empty-state">
        <Share2 size={42} />
        <h2>Pick a burn worth sharing.</h2>
        <p>Pick a roast from the roast room to make its share card.</p>
        <Link href="/" className="btn btn-primary">
          Back to the roast room
        </Link>
      </div>
    );
  const p = findPersona(roast.persona);
  async function exportImage(share = false) {
    if (!ref.current) return;
    setBusy(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(ref.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      if (!blob) throw new Error("Unable to create image.");
      if (await shareImage(blob, share)) {
        toast("Your roast card is ready to save or share.");
        return;
      }
      const file = new File([blob], "roast-me-ai.png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My ego survived Roast Me AI",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "roast-me-ai.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Roast card downloaded. Your group chat has been warned.");
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError")
        toast("Could not export this card. Try copying the quote.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="screen-narrow share-page">
      <Back />
      <Heading
        eyebrow="MAKE IT OFFICIAL"
        title="This burn deserves an audience."
        description="A little damage. Beautifully packaged."
        icon={<Share2 />}
      />
      <div ref={ref} className={`share-card share-${theme}`}>
        <div className="share-brand">
          <Flame size={23} />
          <b>
            ROAST ME <em>AI</em>
          </b>
          <span>#RoastMeAI</span>
        </div>
        <div className="share-body">
          <Portrait id={p.id} />
          <div>
            <span className="share-quote-mark">“</span>
            <blockquote>{roast.content}</blockquote>
            <span className="share-author">— {p.name}</span>
          </div>
        </div>
        {roast.image && (
          <img
            className="share-photo"
            src={roast.image}
            alt="Your roasted photo"
            crossOrigin="anonymous"
          />
        )}
        <footer>
          Pick a persona. Get roasted. <span>roast me ai</span>
        </footer>
      </div>
      <div className="theme-picker" aria-label="Card theme">
        {["fire", "violet", "midnight", "pink"].map((t) => (
          <button
            aria-label={`${t} theme`}
            aria-pressed={theme === t}
            className={`theme-${t} ${theme === t ? "selected" : ""}`}
            key={t}
            onClick={() => setTheme(t)}
          >
            {theme === t && <Check size={16} />}
          </button>
        ))}
      </div>
      <div className="share-buttons">
        <Button disabled={busy} onClick={() => void exportImage(true)}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Share2 size={18} />
          )}
          Share roast card
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void exportImage()}
        >
          <Download size={18} />
          Download PNG
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            void copyText(roast.content)
              .then(() => toast("Quote copied."))
              .catch(() => toast("Clipboard unavailable."))
          }
        >
          <Copy size={16} />
          Copy quote
        </Button>
      </div>
    </div>
  );
}

function Onboarding() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const items = [
    { title: "Meet your", accent: "match.", desc: "Six personalities. Six ways to question your life choices.", label: "PICK YOUR ROASTER", icon: Flame, detail: "Savage, Grandma, CEO, Judgy Cat, Robot or Drama Queen. Find your kind of funny." },
    { title: "Bring the", accent: "heat.", desc: "Roast a message, drop a photo or challenge an AI to a battle.", label: "MAKE IT YOURS", icon: Swords, detail: "Set the chaos. Choose your reply length. Save and share the best punchlines." },
    { title: "Fresh fire.", accent: "Every day.", desc: "Start with 5 free daily credits. No card needed.", label: "YOUR DAILY DOSE", icon: Coins, detail: "Daily credits reset at 00:00 UTC. Unused daily credits don’t roll over." },
  ];
  const current = items[slide];
  const StepIcon = current.icon;
  return (
    <div className="entry-card onboarding-card">
      <Link href="/sign-in" className="skip-link">Skip <ArrowRight size={15} /></Link>
      <div className="signin-hero" role="img" aria-label="Savage, the smiling flame mascot. Roast Me AI." />
      <div className="onboarding-copy" aria-live="polite" aria-atomic="true">
        <span className="onboarding-kicker">{current.label}</span>
        <h1>{current.title} <em>{current.accent}</em></h1>
        <p>{current.desc}</p>
        <div className="onboarding-detail"><span className="onboarding-step-icon"><StepIcon size={22} /></span><p>{current.detail}</p></div>
      </div>
      <div className="onboarding-bottom">
        <div className="carousel-dots" aria-label="Onboarding steps">
          {items.map((_, i) => <button key={i} type="button" className={slide === i ? "active" : ""} onClick={() => setSlide(i)} aria-current={slide === i ? "step" : undefined} aria-label={`Step ${i + 1}: ${items[i].label}`} />)}
        </div>
        <Button className="wide onboarding-next" onClick={() => slide < 2 ? setSlide(slide + 1) : router.push("/sign-in")}>
          {slide === 2 ? "Let’s get roasting" : "Continue"}<ArrowRight size={20} />
        </Button>
        <span className="onboarding-footnote"><ShieldCheck size={13} /> Playful roasts. Consenting adults. 18+.</span>
      </div>
    </div>
  );
}
function SignIn({ link = false }: { link?: boolean }) {
  const { auth } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [emailOpen, setEmailOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [password, setPassword] = useState("");
  const { run, busy } = useAction();
  return (
    <div className={`entry-card signin-card${emailOpen ? " email-open" : ""}`}>
      <div className="signin-hero" role="img" aria-label="Savage, the smiling flame mascot. Roast Me AI." />
      <h1>{link ? "Keep every glorious burn." : <>Let’s get <em>roasting.</em></>}</h1>
      <p>
        {link
          ? "Link your guest account to keep your credits, settings, and roast history."
          : "Pick a persona. Get roasted. Take nothing personally."}
      </p>
      <label className="signin-consent">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          required
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <div className="stack auth-buttons">
        <Button
          className="google-button"
          disabled={busy || !acceptedTerms}
          onClick={() => void run(() => auth(link ? "google-link" : "google"))}
        >
          <span className="signin-button-icon"><img src="/google-mark.svg" alt="" width="24" height="24" /></span>
          <span>{link ? "Link with Google" : "Continue with Google"}</span>
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          aria-expanded={emailOpen}
          aria-controls="email-password-form"
          onClick={() => setEmailOpen(!emailOpen)}
        >
          <span className="signin-button-icon"><Mail size={23} /></span>
          <span>Continue with email</span>
        </Button>
        {emailOpen && (
          <form id="email-password-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!acceptedTerms) return;
              void run(async () => {
                await auth("password", email.trim(), password);
                router.push("/");
              });
            }}
          >
            <label htmlFor="email" className="field-label">
              Your email
            </label>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <label htmlFor="signin-password" className="field-label">Password</label>
            <input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
            <Button className="wide" disabled={busy || !acceptedTerms}>
              Sign in
              <ArrowRight size={17} />
            </Button>
          </form>
        )}
        <Button
          variant="outline"
          disabled={busy || !acceptedTerms}
          onClick={() =>
            void run(async () => {
              await auth("guest");
              router.push("/safety");
            })
          }
        >
          <span className="signin-button-icon"><UserRound size={24} /></span>
          <span>{link ? "Maybe later" : "Continue as guest"}</span>
        </Button>
      </div>
    </div>
  );
}
function Safety() {
  return (
    <div className="entry-card safety-card">
      <Portrait className="safety-mascot" />
      <span className="eyebrow">BEFORE WE TURN UP THE HEAT</span>
      <h1>
        All fire.
        <br />
        <em>No hate.</em>
      </h1>
      <p>A good roast makes you laugh, not feel small.</p>
      <div className="guidelines">
        <h3>
          <ShieldCheck size={22} />
          Keep it fun & friendly
        </h3>
        {[
          "This is entertainment. Don’t take the burns to heart.",
          "Roast yourself or friends who have given permission.",
          "Keep it about choices, habits, and harmless quirks.",
        ].map((t) => (
          <p key={t}>
            <CheckCircle2 size={18} />
            {t}
          </p>
        ))}
        {[
          "No hate, harassment, threats, or harmful content.",
          "No targeting identity, sensitive traits, or trauma.",
        ].map((t) => (
          <p className="no-guideline" key={t}>
            <X size={18} />
            {t}
          </p>
        ))}
      </div>
      <Link href="/" className="btn btn-primary wide">
        I get it. Bring the heat.
        <ArrowRight size={17} />
      </Link>
      <Link href="/guidelines" className="text-link">
        Read our community guidelines
      </Link>
    </div>
  );
}

function Profile() {
  const { state, signout } = useApp();
  const { busy, run } = useAction();
  return (
    <div className="screen-narrow settings-page account-settings-page">
      <Back label="Back to roast room" />
      <Heading title="Account & settings" icon={<UserRound />} />
      <div className="profile-card">
        <Portrait className="profile-avatar" />
        <div>
          <h2>{state.email?.split("@")[0] || "Roast Rookie"}</h2>
          <p>{state.guest ? "Guest account" : state.email}</p>
          <span className="profile-badge">
            {state.premium ? "👑 Premium member" : "Free plan"}
          </span>
        </div>
      </div>
      {state.guest && (
        <Link href="/link-account" className="link-account-banner">
          <Link2 size={22} />
          <span>
            <b>Keep your roasts.</b>
            <small>Link your account. Keep your credits and history.</small>
          </span>
          <ArrowRight size={18} />
        </Link>
      )}
      <div className="profile-stats">
        <button
          type="button"
          className="profile-stat-btn"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("roast:open-credits"))
          }
        >
          <Coins />
          <b>{state.credits}</b>
          <span>Credits · Get more</span>
          <ChevronRight size={17} />
        </button>
        <Link href="/premium">
          <Crown />
          <b>{state.premium ? "Premium" : "Free plan"}</b>
          <span>
            {state.premium ? "The whole fire" : "Room to turn up the heat"}
          </span>
          <ChevronRight size={17} />
        </Link>
      </div>
      <div className="settings-list">
        <Row
          onClick={() => {
            window.dispatchEvent(new CustomEvent("roast:open-saved"));
          }}
          icon={<Heart fill="#f43f5e" color="#f43f5e" />}
          title="Saved roasts"
          desc="The burns that deserve an encore"
        />
        <Row
          href="/subscription"
          icon={<Crown />}
          title="Account & subscription"
          desc="Plans, purchases, and billing help"
        />
      </div>
      <Settings embedded />
      <Button
        variant="outline"
        className="wide"
        disabled={busy}
        onClick={() => void run(signout)}
      >
        <LogOut size={17} />
        Sign out
      </Button>
      <Link href="/delete-account" className="delete-account-link">
        Delete my account
      </Link>
      <DemoNotice />
    </div>
  );
}
function Row({
  href,
  icon,
  title,
  desc,
  onClick,
}: {
  href?: string;
  icon: ReactNode;
  title: string;
  desc?: string;
  onClick?: () => void;
}) {
  const contents = (
    <>
      {icon}
      <span>
        <b>{title}</b>
        {desc && <small>{desc}</small>}
      </span>
      <ChevronRight size={17} />
    </>
  );
  return href ? (
    <Link href={href} className="settings-row">
      {contents}
    </Link>
  ) : (
    <button onClick={onClick} className="settings-row">
      {contents}
    </button>
  );
}
function Settings({ embedded = false }: { embedded?: boolean }) {
  const { state, api, toast, ready } = useApp();
  const { busy, run } = useAction();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [capabilities, setCapabilities] = useState({ notifications: false, haptics: false });
  useEffect(() => {
    setCapabilities({
      notifications: isNative() || ("Notification" in window && window.isSecureContext),
      haptics: isNative() || "vibrate" in navigator,
    });
  }, []);
  useEffect(() => {
    const refresh = () => {
      void import("@/lib/native/notifications")
        .then(({ notificationEnabled }) => notificationEnabled())
        .then(setNotificationsEnabled)
        .catch(() => setNotificationsEnabled(false))
        .finally(() => setNotificationsReady(true));
    };
    refresh();
    window.addEventListener("roast:notifications-changed", refresh);
    return () =>
      window.removeEventListener("roast:notifications-changed", refresh);
  }, []);
  return (
    <div
      className={
        embedded ? "account-preferences" : "screen-narrow settings-page"
      }
    >
      {!embedded && (
        <>
          <Back label="Back to roast room" />
          <Heading
            title="Settings"
            description="Your roast, your rules. Make it feel like you."
            icon={<SettingsIcon />}
          />
        </>
      )}
      <details className="settings-group account-roast-controls">
        <summary>Roast controls</summary>
        <Controls compact />
      </details>
      <div className="settings-group">
        <h3>App preferences</h3>
        <div className="settings-panel">
          {[
            {
              key: "notifications",
              icon: Bell,
              title: "Notifications",
              desc: isNative()
                ? "One daily reminder at your usual time"
                : "Daily reminder while this site is open",
              status: "Unsupported browser",
              disabled: !capabilities.notifications,
            },
            {
              key: "dark",
              icon: Moon,
              title: "Dark mode",
              desc: "Switch between dark and light",
              status: "",
              disabled: false,
            },
            {
              key: "sound",
              icon: Volume2,
              title: "Sound effects",
              desc: "Subtle clicks and a soft reply tone",
              status: "",
              disabled: false,
            },
            {
              key: "haptics",
              icon: Smartphone,
              title: "Haptic feedback",
              desc: "Gentle feedback on taps and replies",
              status: "Unsupported browser",
              disabled: !capabilities.haptics,
            },
          ].map(({ key, icon: Icon, title, desc, disabled, status }) => (
            <div className="settings-row" key={key}>
              <Icon />
              <span>
                <b>{title}</b>
                <small>{desc}</small>
              </span>
              {disabled ? (
                <span className="settings-status">{status}</span>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-label={title}
                  aria-checked={
                    key === "notifications"
                      ? notificationsEnabled
                      : !!state.settings[key]
                  }
                  disabled={
                    busy || (key === "notifications" && !notificationsReady)
                  }
                  className={`settings-switch ${(key === "notifications" ? notificationsEnabled : state.settings[key]) ? "on" : ""}`}
                  onClick={() => {
                    if (key === "sound" && !state.settings.sound) {
                      unlockAudio();
                      playSound("reply");
                    }
                    void run(async () => {
                      if (key === "notifications") {
                        const { setNotificationEnabled } =
                          await import("@/lib/native/notifications");
                        const requested = !notificationsEnabled;
                        const enabled = await setNotificationEnabled(requested);
                        setNotificationsEnabled(enabled);
                        if (requested && !enabled)
                          throw new Error(
                            "Notifications are blocked. Enable them in your device or browser site settings.",
                          );
                        toast(
                          enabled
                            ? "Daily reminders enabled."
                            : "Daily reminders turned off.",
                        );
                        return;
                      }
                      await api("settings", {
                        ...state.settings,
                        [key]: !state.settings[key],
                      });
                      toast("Preference saved.");
                    });
                  }}
                >
                  <span />
                </button>
              )}
            </div>
          ))}
          <div className="settings-row">
            <Globe />
            <span>
              <b>Reply language</b>
              <small>Language of new roasts · Menus stay in English</small>
            </span>
            <select
              aria-label="Reply language"
              className="settings-language"
              disabled={busy || !ready}
              value={String(state.settings.language || "English")}
              onChange={(event) => {
                const language = event.target.value;
                void run(async () => {
                  await api("settings", { ...state.settings, language });
                  toast("Reply language saved.");
                });
              }}
            >
              {replyLanguages.map((language) => (
                <option key={language} value={language}>
                  {languageLabels[language]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="settings-group">
        <h3>Help & privacy</h3>
        <div className="settings-panel">
          {isNative() && !!process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID && (
            <Row
              icon={<ShieldCheck />}
              title="Ad privacy choices"
              desc="Review your advertising consent"
              onClick={() =>
                void run(async () => {
                  const { openAdPrivacyChoices } = await import("@/lib/native/consent");
                  await openAdPrivacyChoices();
                })
              }
            />
          )}
          <Row href="/about" icon={<Mail />} title="Help, safety & feedback" />
          <Row href="/privacy" icon={<LockKeyhole />} title="Privacy policy" />
        </div>
      </div>
    </div>
  );
}
function Subscription() {
  const { state, api, signout } = useApp();
  const { busy, run } = useAction();
  return (
    <div className="screen-narrow">
      <Heading
        title="Account & subscription"
        description="Less paperwork. More punchlines."
        icon={<Crown />}
      />
      <div className="subscription-status">
        <Crown size={36} />
        <div>
          <h2>{state.premium ? "Premium member" : "Keeping it free"}</h2>
          <p>
            {state.premium
              ? "You’re unstoppable."
              : "Daily credits, all personas, plenty of fire."}
          </p>
        </div>
        <span>{state.premium ? "Active" : "Free plan"}</span>
      </div>
      <div className="settings-list">
        <Row
          onClick={() => void run(() => api("billing/manage", {}))}
          icon={<SettingsIcon />}
          title="Manage subscription"
          desc="View, change, or cancel your plan"
        />
        <Row
          onClick={() => void run(() => api("billing/restore", {}))}
          icon={<RefreshCw />}
          title="Restore purchases"
          desc="Restore access through your billing provider"
        />
        <Row
          href="/help"
          icon={<Mail />}
          title="Billing help"
          desc="Charges, refunds, and cancellation guidance"
        />
        <Row
          href="/help"
          icon={<CircleHelp />}
          title="Frequently asked questions"
          desc="Get a few things off your mind"
        />
      </div>
      <p className="notice">
        <Info size={18} />
        Subscription checkout is not connected yet. You cannot be charged in
        this version.
      </p>
      <Settings embedded />
      <Button
        variant="outline"
        className="wide"
        disabled={busy}
        onClick={() => void run(signout)}
      >
        <LogOut size={17} />
        Sign out
      </Button>
    </div>
  );
}
function DeleteAccount() {
  const { api, toast } = useApp();
  const router = useRouter();
  const [value, setValue] = useState("");
  const { busy, run } = useAction();
  return (
    <div className="screen-narrow delete-page">
      <Back />
      <div className="danger-symbol">
        <Trash2 size={52} />
      </div>
      <Heading
        title="Time to put out the fire?"
        description="Deleting your account permanently removes your roast history, saved content, settings, and remaining credits."
      />
      <div className="danger-notice">
        <h3>This action cannot be undone.</h3>
        <p>
          Your uploaded photos and account data will be deleted. If you have an
          active store subscription, cancel it through that store before
          deleting your account.
        </p>
      </div>
      <label className="field-label" htmlFor="delete-confirm">
        Type DELETE to confirm
      </label>
      <input
        id="delete-confirm"
        placeholder="DELETE"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
      />
      <Button
        variant="danger"
        className="wide"
        disabled={value !== "DELETE" || busy}
        onClick={() =>
          void run(async () => {
            await api("account/delete", { confirmation: value });
            const { browserSupabase } = await import("@/lib/supabase");
            await browserSupabase()?.auth.signOut();
            toast("Your account and roast data have been deleted.");
            router.push("/onboarding");
          })
        }
      >
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Trash2 size={17} />
        )}
        Permanently delete account
      </Button>
      <Link href="/profile" className="btn btn-ghost wide">
        Actually, I’ll stay
      </Link>
    </div>
  );
}

const legalContent: Record<
  string,
  { title: string; paragraphs: { title: string; text: string }[] }
> = {
  privacy: {
    title: "Privacy, without the punchline.",
    paragraphs: [
      {
        title: "What this app stores",
        text: "When connected, Roast Me AI stores your account identifier, email when provided, roast prompts and replies, photo uploads, saved roasts, preferences, reports, and credit records in Supabase. Guest accounts also receive a unique identifier.",
      },
      {
        title: "AI processing",
        text: "Text prompts and recent conversation context are sent to Groq for generation and moderation. Images and image prompts are sent to Google’s Gemini API. Do not upload private documents, sensitive information, or photos you do not have permission to use.",
      },
      {
        title: "Daily reminders",
        text: "If notifications are allowed, the Android app uses recent app-open times stored on your device to choose a reminder time. This history is kept for up to 60 days and is not sent to our server. You can turn reminders off in Settings or in your phone's notification settings.",
      },
      {
        title: "Your control",
        text: "You can delete individual roasts from history or delete your full account in Profile → Delete my account. Photo links are temporary and storage is private. The local demo keeps sample history in server memory until restart.",
      },
      {
        title: "Before public launch",
        text: "The app operator must publish its legal identity, privacy contact, retention periods, provider agreements, and applicable regional rights before accepting public users. Advertising and payment processing are not enabled in this version.",
      },
    ],
  },
  terms: {
    title: "A few ground rules.",
    paragraphs: [
      {
        title: "Entertainment, first",
        text: "Roast Me AI generates playful comedy. Outputs are fictional entertainment, not factual assessments, professional advice, or permission to harass anyone. Use only content you own or have permission to share.",
      },
      {
        title: "Credits and subscriptions",
        text: "Text and chat cost 1 credit per reply. A three-round roast battle costs 3 credits (1 per completed round). Image roasts cost 2 credits. Credits are charged only after a successful generation. Your balance resets to 5 credits at 00:00 UTC each day; unused credits do not carry over. Planned subscriptions are $4.99 weekly and $15.99 monthly; purchases are not currently enabled.",
      },
      {
        title: "Acceptable use",
        text: "Do not submit hateful, dangerous, exploitative, threatening, or abusive content. Do not target protected traits, trauma, or non-consenting individuals. Attempts to bypass moderation or economic safeguards may result in access restrictions.",
      },
      {
        title: "Draft launch terms",
        text: "These product terms describe the current build. The operator must finalize business details, age eligibility, jurisdiction, refund terms, consumer rights, and support contact before public release.",
      },
    ],
  },
  guidelines: {
    title: "Keep the heat. Keep the humanity.",
    paragraphs: [
      {
        title: "What makes a good roast",
        text: "Your own procrastination. Your coffee dependency. That outfit you spent two hours making look effortless. Keep it light, specific, and about harmless choices.",
      },
      {
        title: "Consent comes first",
        text: "Roast yourself, fictional personas, or adults who clearly agreed. Do not turn this app into a tool for bullying classmates, coworkers, strangers, or public figures.",
      },
      {
        title: "Where we draw the line",
        text: "No hate, protected-trait attacks, exploitation, violence, self-harm encouragement, sexual content involving minors, or trauma-based insults. Strong roast intensity never overrides these boundaries.",
      },
      {
        title: "Help us improve",
        text: "Every generated response has a report button. Choose a reason and optionally explain the problem. Reports are stored for review by the app operator; live moderation staffing must be arranged before launch.",
      },
    ],
  },
  help: {
    title: "A little help with the heat.",
    paragraphs: [
      {
        title: "How do credits work?",
        text: "You start with 5 credits. A text response uses 1, a three-round battle uses 3 (1 per completed round), and an image roast uses 2. Failed or blocked generations do not use credits. Free credits reset to 5 at 00:00 UTC each day.",
      },
      {
        title: "Can I save my guest account?",
        text: "Yes. Go to Profile → Link your account to add Google or email to your existing guest identity. New linked identities retain the same user ID and history. If an email already belongs to another account, merging requires operator assistance.",
      },
      {
        title: "Where are ads and subscriptions?",
        text: "The screens and server boundaries are ready, but no ad network or billing provider is connected. Ads cannot award credits and checkout cannot charge money until verified server callbacks are implemented.",
      },
      {
        title: "How do I cancel or restore?",
        text: "When store billing is connected, manage or cancel through Google Play, the App Store, or the original payment provider. Deleting an app or account does not cancel a store subscription. Restore purchases will query that provider once configured.",
      },
      {
        title: "Contact and launch status",
        text: "This is a local development build. A verified support address, billing contact, and public account-deletion URL must be configured by the operator before launch. You can already report a specific response using its Report action.",
      },
    ],
  },
};
function InfoPage({ kind }: { kind: string }) {
  if (kind === "about")
    return (
      <div className="screen-narrow about-page">
        <Portrait className="about-mascot" />
        <Heading
          eyebrow="SAME JOKES. HIGHER STANDARDS."
          title="Roast Me AI"
          description="A little self-awareness. A lot of personality. Version 1.0.0."
        />
        <div className="settings-list">
          <Row href="/help" icon={<CircleHelp />} title="How it works & help" />
          <Row
            href="/guidelines"
            icon={<ShieldCheck />}
            title="Community guidelines"
          />
          <Row
            href="/terms"
            icon={<MessageSquare />}
            title="Terms of service"
          />
          <Row href="/privacy" icon={<LockKeyhole />} title="Privacy policy" />
          <Row
            href="/delete-account"
            icon={<Trash2 />}
            title="Delete your account"
          />
        </div>
        <p className="center muted">
          Made with 🔥 and a questionable sense of humor.
        </p>
      </div>
    );
  const info = legalContent[kind] || legalContent.help;
  return (
    <div className="screen-narrow legal-page">
      <Back />
      <Heading eyebrow="THE IMPORTANT STUFF" title={info.title} />
      {info.paragraphs.map((p) => (
        <section key={p.title}>
          <h2>{p.title}</h2>
          <p>{p.text}</p>
        </section>
      ))}
    </div>
  );
}
function AuthCallback() {
  const { api, reload, toast } = useApp();
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { browserSupabase } = await import("@/lib/supabase");
      const sb = browserSupabase();
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (params.has("error") || hash.has("error"))
        throw new Error(
          "Sign-in was cancelled or could not be completed. Please try again.",
        );
      if (!sb) throw new Error("Sign-in is not configured.");
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (!data.session)
        throw new Error(
          "No sign-in session was received. Please request a new link.",
        );
      await api("premium/connect", {});
      await reload();
      if (alive) router.replace("/");
    })().catch((e) => {
      if (alive) toast(e.message);
    });
    return () => {
      alive = false;
    };
  }, [api, reload, router, toast]);
  return (
    <div className="empty-state">
      <LoaderCircle className="spin" size={36} />
      <h2>Getting your roast room ready…</h2>
      <Link href="/sign-in">Back to sign in</Link>
    </div>
  );
}
export function AppScreen({ segments }: { segments: string[] }) {
  const page = segments[0] || "home";
  let content: ReactNode;
  switch (page) {
    case "home":
      content = <Home />;
      break;
    case "persona":
      content = <PersonaDetail id={segments[1] || "savage"} />;
      break;
    case "chat":
      content = <InstaChatScreen initialPersonaId={segments[1] || "savage"} />;
      break;
    case "text":
      content = <ComposerScreen />;
      break;
    case "battle":
      content = <Battle live={segments[1] === "live"} />;
      break;
    case "saved":
      content = <SavedPage />;
      break;
    case "image":
      content = <ComposerScreen mode="image" />;
      break;
    case "history":
      content = <History />;
      break;
    case "rewards":
      content = <Rewards />;
      break;
    case "premium":
      content = <Premium />;
      break;
    case "share":
      content = <ShareCard id={segments[1] || ""} />;
      break;
    case "onboarding":
      content = <Onboarding />;
      break;
    case "sign-in":
      content = <SignIn />;
      break;
    case "link-account":
      content = <SignIn link />;
      break;
    case "safety":
      content = <Safety />;
      break;
    case "profile":
      content = <Profile />;
      break;
    case "settings":
      content = <Profile />;
      break;
    case "subscription":
      content = <Subscription />;
      break;
    case "delete-account":
      content = <DeleteAccount />;
      break;
    case "controls":
      content = (
        <div className="screen-narrow">
          <Heading title="Roast controls" />
          <Controls />
        </div>
      );
      break;
    case "auth":
      content = <AuthCallback />;
      break;
    case "privacy":
    case "terms":
    case "guidelines":
    case "help":
    case "about":
      content = <InfoPage kind={page} />;
      break;
    default:
      content = (
        <div className="empty-state">
          <h1>This page got roasted.</h1>
          <Link href="/" className="btn btn-primary">
            Back to the roast room
          </Link>
        </div>
      );
  }
  return (
    <motion.div
      className="screen-root"
      data-screen={page}
      key={segments.join("/")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0%",
        minHeight: 0,
      }}
    >
      {content}
    </motion.div>
  );
}
