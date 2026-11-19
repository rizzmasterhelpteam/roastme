"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";

export function StoryAd({ variant = "mid" }: { variant?: "mid" | "bottom" }) {
  if (variant === "mid") {
    return (
      <aside className="story-ad-card">
        <span className="story-ad-label">ROAST ME AI</span>
        <h3>Dealing with someone completely out of touch with reality?</h3>
        <p>
          Drop their text into Roast Me AI. Pick your favorite persona—Savage, Grandma, or CEO—and see what a zero-filter reality check looks like.
        </p>
        <div className="story-ad-actions">
          <Link href="/" className="story-ad-btn">
            Try the roast room
          </Link>
          <span className="story-ad-note">Free on web and Android</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="story-ad-card story-ad-card-alt">
      <span className="story-ad-label">ROAST BATTLE</span>
      <h3>Who was actually in the wrong?</h3>
      <p>
        Got a weird family argument or bad group chat drama? Put both sides into Roast Battle and let AI decide who takes the hit.
      </p>
      <div className="story-ad-actions">
        <Link href="/battle" className="story-ad-btn story-ad-btn-alt">
          Start a roast battle
        </Link>
        <span className="story-ad-note">3 quick rounds of banter</span>
      </div>
    </aside>
  );
}

export function StoryPoll() {
  const [voted, setVoted] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("poll-wedding-invoice");
      if (saved) setVoted(saved);
    } catch {}
  }, []);

  const handleVote = (choice: string) => {
    setVoted(choice);
    try {
      localStorage.setItem("poll-wedding-invoice", choice);
    } catch {}
  };

  return (
    <section className="story-poll-card" aria-label="Reader Verdict Poll">
      <span className="story-poll-tag">READER VERDICT</span>
      <h3>Was I wrong for taking back my wedding gift and walking out?</h3>

      {!voted ? (
        <div className="story-poll-options">
          <button
            type="button"
            className="story-poll-btn"
            onClick={() => handleVote("nta")}
          >
            <span className="story-poll-btn-title">Not the jerk</span>
            <span className="story-poll-btn-text">
              Charging guests $120 for dinner after taking gifts is completely unhinged.
            </span>
          </button>
          <button
            type="button"
            className="story-poll-btn"
            onClick={() => handleVote("yta")}
          >
            <span className="story-poll-btn-title">In the wrong</span>
            <span className="story-poll-btn-text">
              Taking the gift back made a scene on your brother&apos;s wedding day.
            </span>
          </button>
        </div>
      ) : (
        <div className="story-poll-results">
          <div className="story-poll-row">
            <div className="story-poll-meta">
              <span>Not the jerk</span>
              <strong>96%</strong>
            </div>
            <div className="story-poll-track">
              <div className="story-poll-bar" style={{ width: "96%" }} />
            </div>
          </div>

          <div className="story-poll-row">
            <div className="story-poll-meta">
              <span>In the wrong</span>
              <strong>4%</strong>
            </div>
            <div className="story-poll-track">
              <div
                className="story-poll-bar story-poll-bar-alt"
                style={{ width: "4%" }}
              />
            </div>
          </div>

          <p className="story-poll-confirm">
            <Check size={15} /> You voted:{" "}
            <strong>{voted === "nta" ? "Not the jerk" : "In the wrong"}</strong>. Thanks for voting.
          </p>
        </div>
      )}
    </section>
  );
}
