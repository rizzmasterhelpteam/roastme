"use client";
import { Info, Flame } from "lucide-react";
import { useApp } from "./app-provider";
import { levelFromChaos } from "@/lib/personas";
import "./reply-length.css";
export function Controls({ compact = false }: { compact?: boolean }) {
  const { chaos, setChaos, replyLength, setReplyLength } = useApp();
  const level = levelFromChaos(chaos);
  return (
    <section className={`controls ${compact ? "compact" : ""}`}>
      <fieldset className="reply-length-control">
        <legend>Reply length</legend>
        <div>
          {(["short", "medium", "long"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={replyLength === value}
              onClick={() => setReplyLength(value)}>
              <strong>{value === "short" ? "Short" : value === "medium" ? "Medium" : "Long"}</strong>
              <small>{value === "short" ? "1 liner" : value === "medium" ? "2–3 lines" : "Full roast"}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="control-label chaos-label">
        Roast chaos <Info size={13} />
        <span>More chaos means wilder and sharper roasts.</span>
        <b>
          {level} · {chaos}%
        </b>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={chaos}
        onChange={(e) => setChaos(Number(e.target.value))}
        aria-label="Roast chaos and intensity"
        style={{ "--range": `${chaos}%` } as React.CSSProperties}
      />
      <div className="range-labels">
        <span>Playful</span>
        <span>Spicy</span>
        <span>Savage</span>
        <span>Nuclear</span>
      </div>
      <div className="chaos-note">
        <Flame size={15} />
        {chaos < 34
          ? "Clean punchlines and a gentle simmer."
          : chaos < 60
            ? "Sharper angles with a little surprise."
            : chaos < 80
              ? "Savage punchlines with unpredictable turns."
              : "Nuclear energy. Absurd, wild and ruthless—but playful."}
      </div>
    </section>
  );
}
