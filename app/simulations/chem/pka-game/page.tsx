"use client";

import { useReducer, useEffect, useState, useCallback } from "react";
import SimulationNav from "@/components/layout/SimulationNav";
import GameSetup from "@/components/pka-game/GameSetup";
import QuestionCard from "@/components/pka-game/QuestionCard";
import ResultFeedback from "@/components/pka-game/ResultFeedback";
import TimerBar from "@/components/pka-game/TimerBar";
import StatsPanel from "@/components/pka-game/StatsPanel";
import { getPool, shuffled } from "@/lib/chem/pka-data";
import { recordSession } from "@/lib/chem/pka-stats";
import type {
  GameState,
  GameAction,
  GameConfig,
  QuestionResult,
} from "@/components/pka-game/types";

// ─── Scoring ─────────────────────────────────────────────────────────────────

function computeResult(
  config: GameConfig,
  pka: number,
  userAnswer: number | null,
  timeTakenMs: number | null,
): Pick<QuestionResult, "correct" | "deviation" | "pointsEarned"> {
  if (userAnswer === null) {
    return { correct: false, deviation: null, pointsEarned: 0 };
  }
  const deviation = Math.abs(userAnswer - pka);

  if (config.scoringMode === "tolerance") {
    const correct = deviation <= config.tolerance;
    let pts = 0;
    if (correct) {
      if (config.mode === "per-question" && timeTakenMs !== null) {
        pts = Math.max(1, Math.ceil(10 * (1 - timeTakenMs / 30_000)));
      } else {
        pts = 1;
      }
    }
    return { correct, deviation, pointsEarned: pts };
  }

  // closeness mode: points = max(0, 10 - floor(deviation))
  const basePoints = Math.max(0, 10 - Math.floor(deviation));
  let pts = basePoints;
  if (config.mode === "per-question" && timeTakenMs !== null && basePoints > 0) {
    const timeFactor = Math.max(0.1, 1 - timeTakenMs / 30_000);
    pts = Math.max(1, Math.round(basePoints * timeFactor));
  }
  const correct = deviation <= 1; // "correct" in closeness = within 1 unit
  return { correct, deviation, pointsEarned: pts };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const INITIAL: GameState = {
  phase: "SETUP",
  config: {
    mode: "classic",
    difficulty: "basic",
    categories: [],
    scoringMode: "tolerance",
    tolerance: 1,
    speedRunSeconds: 60,
  },
  pool: [],
  queueIndex: 0,
  current: null,
  questionStartTime: null,
  results: [],
  score: 0,
  sessionStartTime: null,
};

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START": {
      const pool = shuffled(getPool(action.config.difficulty, action.config.categories));
      if (pool.length === 0) return state;
      const now = Date.now();
      return {
        ...INITIAL,
        phase: "PLAYING",
        config: action.config,
        pool,
        queueIndex: 0,
        current: pool[0],
        questionStartTime: now,
        sessionStartTime: now,
      };
    }

    case "ANSWER":
    case "TIME_UP": {
      if (!state.current || state.phase !== "PLAYING") return state;
      const timeTakenMs =
        action.type === "TIME_UP"
          ? (state.config.mode === "per-question" ? 30_000 : null)
          : action.timeTakenMs;
      const userAnswer = action.type === "TIME_UP" ? null : action.answer;

      const { correct, deviation, pointsEarned } = computeResult(
        state.config,
        state.current.pka,
        userAnswer,
        timeTakenMs,
      );

      const result: QuestionResult = {
        entryId: state.current.id,
        userAnswer,
        correct,
        deviation,
        pointsEarned,
        timeTakenMs,
      };

      return {
        ...state,
        phase: "FEEDBACK",
        results: [...state.results, result],
        score: state.score + pointsEarned,
      };
    }

    case "NEXT": {
      const nextIndex = state.queueIndex + 1;
      if (nextIndex >= state.pool.length) {
        return { ...state, phase: "RESULTS", current: null };
      }
      return {
        ...state,
        phase: "PLAYING",
        queueIndex: nextIndex,
        current: state.pool[nextIndex],
        questionStartTime: Date.now(),
      };
    }

    case "SPEED_RUN_END": {
      if (state.phase !== "PLAYING" && state.phase !== "FEEDBACK") return state;
      return { ...state, phase: "RESULTS", current: null };
    }

    case "RESTART":
      return { ...INITIAL };

    default:
      return state;
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PkaGamePage() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [statsOpen, setStatsOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const { phase, config, current, pool, queueIndex, results, score, questionStartTime, sessionStartTime } = state;

  // Save stats when results phase is reached
  useEffect(() => {
    if (phase !== "RESULTS" || results.length === 0) return;
    const durationMs = sessionStartTime ? Date.now() - sessionStartTime : null;
    recordSession(results, config.mode, config.scoringMode, durationMs);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Speed-run countdown
  useEffect(() => {
    if (config.mode !== "speed-run" || phase === "SETUP" || phase === "RESULTS") return;
    if (!sessionStartTime) return;

    const remaining = config.speedRunSeconds * 1000 - (Date.now() - sessionStartTime);
    if (remaining <= 0) {
      dispatch({ type: "SPEED_RUN_END" });
      return;
    }
    const t = setTimeout(() => dispatch({ type: "SPEED_RUN_END" }), remaining);
    return () => clearTimeout(t);
  }, [config.mode, config.speedRunSeconds, phase, sessionStartTime]);

  const handleAnswer = useCallback(
    (value: number) => {
      const timeTakenMs = questionStartTime ? Date.now() - questionStartTime : null;
      dispatch({ type: "ANSWER", answer: value, timeTakenMs });
    },
    [questionStartTime],
  );

  const handleTimeUp = useCallback(() => dispatch({ type: "TIME_UP" }), []);

  const isLast = queueIndex >= pool.length - 1;
  const lastResult = results[results.length - 1] ?? null;

  // Results screen
  function ResultsScreen() {
    const totalCorrect = results.filter((r) => r.correct).length;
    const accuracy = results.length > 0 ? Math.round((totalCorrect / results.length) * 100) : 0;
    const durationMs = sessionStartTime ? Date.now() - sessionStartTime : null;

    return (
      <div className="flex min-h-[calc(100vh-48px)] flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <div className="text-5xl font-bold text-foreground">{accuracy}%</div>
            <div className="mt-1 text-text-muted">
              {totalCorrect} / {results.length} correct
            </div>
            {score > 0 && (
              <div className="mt-2 text-2xl font-semibold text-accent">{score} pts</div>
            )}
            {durationMs && (
              <div className="mt-1 text-xs text-text-muted">
                {Math.round(durationMs / 1000)}s
              </div>
            )}
          </div>

          {/* Per-question breakdown (scrollable) */}
          {results.length > 0 && (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-surface text-left">
              {results.map((r, i) => {
                const entry = pool.find((e) => e.id === r.entryId);
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-0 ${
                      r.correct ? "text-foreground" : "text-red-400/80"
                    }`}
                  >
                    <span className="truncate pr-2">{entry?.name ?? r.entryId}</span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {r.userAnswer !== null ? r.userAnswer.toFixed(2) : "—"} / {entry?.pkaDisplay}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => dispatch({ type: "START", config })}
              className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-white hover:bg-accent-hover cursor-pointer"
            >
              Play Again
            </button>
            <button
              onClick={() => dispatch({ type: "RESTART" })}
              className="w-full rounded-xl border border-border py-3 text-sm text-text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Change Settings
            </button>
            <button
              onClick={() => setStatsOpen(true)}
              className="w-full rounded-xl border border-border py-3 text-sm text-text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              View All-time Stats
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Speed-run HUD
  function SpeedRunHud() {
    if (config.mode !== "speed-run" || !sessionStartTime) return null;
    const elapsed = Date.now() - sessionStartTime;
    const remaining = Math.max(0, config.speedRunSeconds - Math.floor(elapsed / 1000));
    return (
      <div className="fixed right-4 top-14 z-40 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-mono text-foreground">
        {remaining}s · {score}pts
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SimulationNav title="pKa Quiz" />

      {/* Stats button */}
      <button
        onClick={() => setStatsOpen(true)}
        className="fixed right-4 top-[52px] z-40 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
        title="Statistics"
      >
        ≡
      </button>

      {/* Timer bar (per-question mode) */}
      {config.mode === "per-question" && phase === "PLAYING" && (
        <TimerBar
          durationMs={30_000}
          running={phase === "PLAYING"}
          onExpire={handleTimeUp}
          resetKey={queueIndex}
        />
      )}

      {/* Speed-run HUD */}
      {phase !== "SETUP" && phase !== "RESULTS" && (
        <SpeedRunHud key={score /* re-render on score change */} />
      )}

      <main className="flex flex-1 flex-col items-center justify-start overflow-y-auto px-4 py-8">
        {/* Progress (during game) */}
        {(phase === "PLAYING" || phase === "FEEDBACK") && pool.length > 0 && (
          <div className="mb-6 flex w-full max-w-sm items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent/50 transition-all"
                style={{ width: `${((queueIndex + 1) / pool.length) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-text-muted">
              {queueIndex + 1} / {pool.length}
            </span>
            {score > 0 && (
              <span className="shrink-0 text-xs font-semibold text-accent">{score}pts</span>
            )}
          </div>
        )}

        <div className="w-full max-w-sm">
          {phase === "SETUP" && (
            <GameSetup onStart={(cfg) => dispatch({ type: "START", config: cfg })} />
          )}

          {phase === "PLAYING" && current && (
            <QuestionCard entry={current} onAnswer={handleAnswer} disabled={false} />
          )}

          {phase === "FEEDBACK" && current && lastResult && (
            <ResultFeedback
              entry={current}
              result={lastResult}
              scoringMode={config.scoringMode}
              onNext={() => {
                if (config.mode === "speed-run") {
                  // Check if total time expired
                  const elapsed = sessionStartTime ? Date.now() - sessionStartTime : 0;
                  if (elapsed >= config.speedRunSeconds * 1000) {
                    dispatch({ type: "SPEED_RUN_END" });
                    return;
                  }
                }
                dispatch({ type: "NEXT" });
              }}
              isLast={isLast}
            />
          )}

          {phase === "RESULTS" && <ResultsScreen />}
        </div>
      </main>

      <StatsPanel
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        onClear={() => forceUpdate((n) => n + 1)}
      />
    </div>
  );
}
