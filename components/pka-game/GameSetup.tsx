"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/chem/pka-data";
import type { GameConfig, GameMode, ScoringMode, PkaCategory } from "@/components/pka-game/types";

interface Props {
  onStart: (config: GameConfig) => void;
}

const ALL_CATEGORIES = CATEGORIES.map((c) => c.id);

export default function GameSetup({ onStart }: Props) {
  const [mode, setMode] = useState<GameMode>("classic");
  const [difficulty, setDifficulty] = useState<"basic" | "advanced">("basic");
  const [categories, setCategories] = useState<PkaCategory[]>([...ALL_CATEGORIES]);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("tolerance");
  const [tolerance, setTolerance] = useState(1);
  const [speedRunSeconds, setSpeedRunSeconds] = useState(60);

  function toggleCategory(id: PkaCategory) {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function handleStart() {
    if (categories.length === 0) return;
    onStart({ mode, difficulty, categories, scoringMode, tolerance, speedRunSeconds });
  }

  const modes: { id: GameMode; label: string; desc: string; icon: string }[] = [
    { id: "classic",     label: "Classic",      desc: "No time pressure",                      icon: "📚" },
    { id: "per-question", label: "Timed",        desc: "30 s per question, points scale with speed", icon: "⏱" },
    { id: "speed-run",   label: "Speed Run",    desc: "Answer as many as possible in fixed time", icon: "⚡" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center justify-start overflow-y-auto px-4 py-8">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">pKa Quiz</h1>
          <p className="mt-1 text-sm text-text-muted">
            Identify the pKa of organic functional groups from their skeletal structures.
            The acidic proton is highlighted in <span className="text-red-400 font-medium">red</span>.
          </p>
        </div>

        {/* Difficulty */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Difficulty</h2>
          <div className="flex gap-3">
            {(["basic", "advanced"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                  difficulty === d
                    ? "border-accent bg-accent-muted text-foreground"
                    : "border-border bg-surface text-text-muted hover:border-border-hover hover:text-foreground",
                )}
              >
                {d === "basic" ? "Basic (Evans table)" : "Advanced (Evans + Reich)"}
              </button>
            ))}
          </div>
        </section>

        {/* Game mode */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Mode</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex flex-1 flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer",
                  mode === m.id
                    ? "border-accent bg-accent-muted"
                    : "border-border bg-surface hover:border-border-hover",
                )}
              >
                <span className="text-lg">{m.icon}</span>
                <span className={cn("mt-1 text-sm font-semibold", mode === m.id ? "text-foreground" : "text-text-muted")}>
                  {m.label}
                </span>
                <span className="mt-0.5 text-xs text-text-muted">{m.desc}</span>
              </button>
            ))}
          </div>
          {mode === "speed-run" && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-text-muted">Duration:</span>
              {[60, 120].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedRunSeconds(s)}
                  className={cn(
                    "rounded-md border px-3 py-1 text-xs transition-colors cursor-pointer",
                    speedRunSeconds === s
                      ? "border-accent bg-accent-muted text-foreground"
                      : "border-border text-text-muted hover:border-border-hover",
                  )}
                >
                  {s}s
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Scoring */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Scoring</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            {([
              {
                id: "tolerance" as ScoringMode,
                label: "Tolerance",
                desc: "Correct if within ±X of true value",
              },
              {
                id: "closeness" as ScoringMode,
                label: "Closeness",
                desc: "Points scale with accuracy (10 − |error|)",
              },
            ] as const).map((s) => (
              <button
                key={s.id}
                onClick={() => setScoringMode(s.id)}
                className={cn(
                  "flex flex-1 flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer",
                  scoringMode === s.id
                    ? "border-accent bg-accent-muted"
                    : "border-border bg-surface hover:border-border-hover",
                )}
              >
                <span className={cn("text-sm font-semibold", scoringMode === s.id ? "text-foreground" : "text-text-muted")}>
                  {s.label}
                </span>
                <span className="mt-0.5 text-xs text-text-muted">{s.desc}</span>
              </button>
            ))}
          </div>
          {scoringMode === "tolerance" && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-text-muted">Tolerance ±</span>
              {[0.5, 1, 2].map((t) => (
                <button
                  key={t}
                  onClick={() => setTolerance(t)}
                  className={cn(
                    "rounded-md border px-3 py-1 text-xs transition-colors cursor-pointer",
                    tolerance === t
                      ? "border-accent bg-accent-muted text-foreground"
                      : "border-border text-text-muted hover:border-border-hover",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Categories */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Compound types</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCategories([...ALL_CATEGORIES])}
                className="text-xs text-text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                All
              </button>
              <span className="text-text-muted text-xs">/</span>
              <button
                onClick={() => setCategories([])}
                className="text-xs text-text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {CATEGORIES.map((cat) => {
              const checked = categories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    checked
                      ? "border-border-hover bg-surface"
                      : "border-border bg-background",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat.id)}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{cat.label}</div>
                    <div className="text-xs text-text-muted">{cat.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={categories.length === 0}
          className={cn(
            "w-full rounded-xl py-4 text-base font-semibold transition-colors cursor-pointer",
            categories.length === 0
              ? "bg-surface text-text-muted cursor-not-allowed border border-border"
              : "bg-accent text-white hover:bg-accent-hover",
          )}
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}
