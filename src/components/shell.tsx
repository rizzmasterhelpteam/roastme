"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Flame,
  Swords,
  Gift,
  Settings,
  ShieldCheck,
  Crown,
  ArrowUpRight,
  Coins,
  UserRound,
  ChevronRight,
  Heart,
  CircleHelp,
  Sparkles,
} from "lucide-react";
import { useApp } from "./app-provider";
import { Portrait } from "./art";
import { Controls } from "./controls";
import { OutOfCredits } from "./screens";

const nav = [
  { href: "/", label: "Roast room", icon: Flame },
  { href: "/battle", label: "Roast battle", icon: Swords },
  { href: "/saved", label: "Saved burns", icon: Heart },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, ready } = useApp();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const savedCount = state.history.filter((r) => r.saved).length;

  useEffect(() => {
    const handleOpenCredits = () => setCreditsOpen(true);
    window.addEventListener("roast:open-credits", handleOpenCredits);
    return () => {
      window.removeEventListener("roast:open-credits", handleOpenCredits);
    };
  }, []);
  const full = [
    "/onboarding",
    "/sign-in",
    "/safety",
    "/auth/callback",
  ].includes(path);
  if (full) return <main className="entry-layout">{children}</main>;
  const isChat = path === "/" || path?.startsWith("/chat");
  return (
    <div className={`app-layout ${isChat ? "chat-screen-layout" : ""}`}>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <Portrait className="brand-icon" />
          <span>
            ROAST ME<span className="brand-ai"> AI</span>
            <small>SAME JOKES. HIGHER STANDARDS.</small>
          </span>
        </Link>
        <div className="workspace-label">YOUR DAILY DOSE OF FIRE</div>
        <nav>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${path === href ? "active" : ""}`}
            >
              <Icon
                size={19}
                fill={
                  href === "/saved" && (path === "/saved" || savedCount > 0)
                    ? "#f43f5e"
                    : "none"
                }
                color={
                  href === "/saved" && (path === "/saved" || savedCount > 0)
                    ? "#f43f5e"
                    : "currentColor"
                }
              />
              <span>{label}</span>
              {href === "/battle" && <small className="new-tag">NEW</small>}
              {href === "/saved" && savedCount > 0 && (
                <span className="saved-badge-pill">{savedCount}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-premium">
          <div className="mini-crown">
            <Crown size={23} />
          </div>
          <h3>
            Your ego has no limits.
            <br />
            Your roasts shouldn’t either.
          </h3>
          <p>Go unlimited. Bring the heat.</p>
          <Link href="/premium" className="upgrade-link">
            Meet Premium <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link className="nav-link" href="/settings">
            <Settings size={19} /> Settings
          </Link>
          <Link className="nav-link" href="/about">
            <CircleHelp size={19} /> Help & about
          </Link>
          <Link href="/profile" className="account-link">
            <span className="user-avatar">
              <UserRound size={19} />
            </span>
            <span>
              {state.guest
                ? "Roast Rookie"
                : state.email?.split("@")[0] || "Roaster"}
              <small>
                {state.premium ? "Premium member" : "Free account"}{" "}
                <span>•</span> {state.guest ? "Guest" : "Signed in"}
              </small>
            </span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        {!isChat && (
          <header className="topbar">
            <div className="breadcrumb">
              <Flame size={16} />
              <span>The roast room</span>
              <span className="crumb-divider">/</span>
              <span className="muted">
                {path === "/"
                  ? "Pick your personality"
                  : path.split("/")[1].replaceAll("-", " ")}
              </span>
            </div>
            <Link href="/" className="mobile-brand">
              <Portrait className="mobile-brand-logo" /> Roast Me <b>AI</b>
            </Link>
            <div className="top-actions">
              <button
                type="button"
                onClick={() => setCreditsOpen(true)}
                className="credit-badge"
                title="Your credits · click to get more"
                aria-label="View credits"
              >
                <Coins size={17} />
                <b>{ready ? (state.premium ? "∞" : state.credits) : "—"}</b>
                <span>credits</span>
              </button>
              <Link
                href="/profile"
                className="top-avatar"
                aria-label="Your profile"
              >
                <UserRound size={18} />
              </Link>
            </div>
          </header>
        )}
        <div className={`page-grid ${path === "/" && !isChat ? "with-rail" : ""}`}>
          <main className="page-content">{children}</main>
          {path === "/" && !isChat && (
            <aside className="right-rail">
              <div className="rail-heading">
                <Settings size={17} /> Make it personal <span>✦</span>
              </div>
              <Controls compact />
              <div className="rail-tip">
                <div className="tip-icon">
                  <Sparkles size={19} />
                </div>
                <span>
                  A little chaos goes a long way.
                  <small>Dial it up. We dare you.</small>
                </span>
              </div>
              <div className="rail-quote">
                <span>“</span>
                <p>
                  My therapist said I need to be humbled.
                  <br />
                  So here we are.
                </p>
                <small>— probably you, in 5 minutes</small>
              </div>
              <Link href="/safety" className="safety-link">
                <ShieldCheck size={16} />
                <span>
                  All fire. No hate.
                  <small>Playful roasts. Real boundaries.</small>
                </span>
                <ChevronRight size={15} />
              </Link>
            </aside>
          )}
        </div>
        {!isChat && (
          <footer className="desktop-footer">
            <span>
              <Flame size={12} /> Made with fire. Take it with a grain of salt.
            </span>
            <div>
              <Link href="/safety">Community guidelines</Link>
              <Link href="/privacy">Privacy</Link>
              <span>© {new Date().getFullYear()} Roast Me AI</span>
            </div>
          </footer>
        )}
      </div>
      <nav className="mobile-nav">
        <Link href="/" className={path === "/" ? "active" : ""}>
          <Flame size={20} />
          <span>Roast</span>
        </Link>
        <Link href="/battle" className={path === "/battle" ? "active" : ""}>
          <Swords size={20} />
          <span>Battle</span>
        </Link>
        <Link href="/saved" className={path === "/saved" ? "active" : ""}>
          <span className="mobile-nav-heart-wrap">
            <Heart
              size={20}
              fill={path === "/saved" || savedCount > 0 ? "#f43f5e" : "none"}
              color={path === "/saved" || savedCount > 0 ? "#f43f5e" : "currentColor"}
            />
            {savedCount > 0 && <span className="mobile-saved-dot" />}
          </span>
          <span>Saved</span>
        </Link>
      </nav>

      {/* Global Out of Credits Modal */}
      {creditsOpen && (
        <OutOfCredits close={() => setCreditsOpen(false)} />
      )}
    </div>
  );
}
