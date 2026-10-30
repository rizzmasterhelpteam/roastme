"use client";
import { Info, Flame } from "lucide-react";
import { useApp } from "./app-provider";
import { levels } from "@/lib/personas";
export function Controls({ compact = false }: { compact?: boolean }) {
  const { level, setLevel, chaos, setChaos } = useApp();
  return (
    <section className={`controls ${compact ? "compact" : ""}`}>
      <div className="control-label">
        Roast level <Info size={13} />
        <span>How much can you handle?</span>
      </div>
      <div className="level-grid">
        {levels.map((l, i) => (
          <button
            key={l}
            className={`level-option ${level === l ? "selected" : ""}`}
            onClick={() => setLevel(l)}
            aria-pressed={level === l}
          >
            <span>{["🙂", "🌶️", "🔥", "☢️"][i]}</span>
            <b>{l}</b>
            {!compact && (
              <small>
                {
                  [
                    "Playful and friendly",
                    "A little kick",
                    "No sugarcoating",
                    "Maximum comedy",
                  ][i]
                }
              </small>
            )}
          </button>
        ))}
      </div>
      <div className="control-label chaos-label">
        Chaos level <Info size={13} />
        <b>{chaos}%</b>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={chaos}
        onChange={(e) => setChaos(Number(e.target.value))}
        aria-label="Chaos level"
        style={{ "--range": `${chaos}%` } as React.CSSProperties}
      />
      <div className="range-labels">
        <span>Calm</span>
        <span>Balanced</span>
        <span>Unhinged</span>
      </div>
      <div className="chaos-note">
        <Flame size={15} />
        {chaos < 34
          ? "Clean punchlines. A gentle simmer."
          : chaos < 70
            ? "A healthy amount of questionable energy."
            : "Absurd tangents. Delightfully unpredictable."}
      </div>
    </section>
  );
}
