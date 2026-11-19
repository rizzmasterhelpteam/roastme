"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Flame, Swords, ArrowRight, CheckCircle2 } from "lucide-react";

export function StoryAd({ variant = "mid" }: { variant?: "mid" | "bottom" }) {
  if (variant === "mid") {
    return (
      <aside className="story-ad-card">
        <div className="story-ad-badge">
          <Flame size={14} className="story-ad-icon-flame" />
          <span>ROAST ME AI REALITY CHECK</span>
        </div>
        <h3>Dealing with someone completely out of touch with reality?</h3>
        <p>
          Don’t lose your temper. Let our AI handle the comeback. Choose Savage, Grandma, or CEO mode to deliver the reality check they earned.
        </p>
        <div className="story-ad-actions">
          <Link href="/" className="story-ad-btn-primary">
            Enter the roast room <ArrowRight size={14} />
          </Link>
          <span className="story-ad-subtext">Free daily credits · No app install needed</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="story-ad-card story-ad-card-bottom">
      <div className="story-ad-badge">
        <Swords size={14} className="story-ad-icon-swords" />
        <span>WHO&apos;S REALLY WRONG?</span>
      </div>
      <h3>Got drama in your family or group chat?</h3>
      <p>
        Settle the score once and for all. Enter a 3-round AI Roast Battle to see who comes out on top—without the awkward Thanksgiving dinner aftermath.
      </p>
      <div className="story-ad-actions">
        <Link href="/battle" className="story-ad-btn-primary">
          Start a Roast Battle <ArrowRight size={14} />
        </Link>
        <span className="story-ad-subtext">Play 1-on-1 vs Savage AI</span>
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
      <div className="story-poll-header">
        <span className="journal-label">READER VERDICT · YOUR DEVICE</span>
        <h3>Am I The Jerk for taking back my wedding gift and walking out?</h3>
      </div>

      {!voted ? (
        <div className="story-poll-options">
          <button
            type="button"
            className="story-poll-btn"
            onClick={() => handleVote("nta")}
          >
            <span className="story-poll-choice">NTA — Not The Jerk</span>
            <span className="story-poll-desc">
              Charging guests $120 per plate after accepting wedding gifts is completely unhinged.
            </span>
          </button>
          <button
            type="button"
            className="story-poll-btn"
            onClick={() => handleVote("yta")}
          >
            <span className="story-poll-choice">YTA — In The Wrong</span>
            <span className="story-poll-desc">
              Taking the gift back made an awkward scene on your brother’s special day.
            </span>
          </button>
        </div>
      ) : (
        <div className="story-poll-results">
          <div className="story-poll-bar-group">
            <div className="story-poll-bar-label">
              <strong>NTA (Not The Jerk)</strong>
              <span>{voted === "nta" ? "Your vote" : ""}</span>
            </div>
            <div className="story-poll-bar-track">
              <div className="story-poll-bar-fill" style={{ width: voted === "nta" ? "100%" : "0%" }} />
            </div>
          </div>

          <div className="story-poll-bar-group">
            <div className="story-poll-bar-label">
              <strong>YTA (In The Wrong)</strong>
              <span>4%</span>
            </div>
            <div className="story-poll-bar-track">
              <div
                className="story-poll-bar-fill story-poll-bar-fill-alt"
                style={{ width: voted === "yta" ? "100%" : "0%" }}
              />
            </div>
          </div>

          <p className="story-poll-voted-msg">
            <CheckCircle2 size={16} /> You voted:{" "}
            <strong>{voted === "nta" ? "NTA (Not The Jerk)" : "YTA (In The Wrong)"}</strong>.
          </p>
        </div>
      )}
    </section>
  );
}
