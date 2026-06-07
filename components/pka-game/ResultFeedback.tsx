"use client";

import { motion } from "framer-motion";
import MoleculeViewer from "./MoleculeViewer";
import type { PkaEntry, QuestionResult, ScoringMode } from "./types";

interface Props {
  entry: PkaEntry;
  result: QuestionResult;
  scoringMode: ScoringMode;
  onNext: () => void;
  isLast: boolean;
}

export default function ResultFeedback({ entry, result, scoringMode, onNext, isLast }: Props) {
  const { correct, userAnswer, deviation, pointsEarned } = result;

  const timedOut = userAnswer === null;
  const deviationText =
    deviation !== null
      ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)} from true value`
      : "";

  return (
    <motion.div
      key={entry.id + "-feedback"}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Result banner */}
      <div
        className={`w-full max-w-xs rounded-xl border px-5 py-4 text-center ${
          correct
            ? "border-green-500/40 bg-green-500/10"
            : "border-red-500/40 bg-red-500/10"
        }`}
      >
        <div className="text-2xl">{correct ? "✓" : timedOut ? "⏰" : "✗"}</div>
        <div className={`mt-1 text-lg font-bold ${correct ? "text-green-400" : "text-red-400"}`}>
          {correct ? "Correct!" : timedOut ? "Time's up!" : "Incorrect"}
        </div>

        {/* Deviation + points */}
        <div className="mt-2 space-y-1 text-sm">
          <div>
            <span className="text-text-muted">True pK</span>
            <sub className="text-text-muted">a</sub>
            <span className="ml-1 font-semibold text-foreground">{entry.pkaDisplay}</span>
          </div>
          {userAnswer !== null && (
            <div>
              <span className="text-text-muted">Your answer: </span>
              <span className="font-medium text-foreground">{userAnswer.toFixed(2)}</span>
              {deviation !== null && (
                <span
                  className={`ml-2 text-xs ${
                    deviation <= 0.5 ? "text-green-400" : deviation <= 2 ? "text-yellow-400" : "text-red-400"
                  }`}
                >
                  ({deviationText})
                </span>
              )}
            </div>
          )}
          {scoringMode === "closeness" && (
            <div className="mt-1 font-semibold text-accent">+{pointsEarned} pts</div>
          )}
        </div>
      </div>

      {/* Compound reveal */}
      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <MoleculeViewer smiles={entry.smiles} width={260} height={170} />
        </div>
        <p className="text-center text-sm font-medium text-foreground">{entry.name}</p>
        {entry.note && (
          <p className="text-center text-xs text-text-muted">{entry.note}</p>
        )}
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        className="w-full max-w-xs rounded-xl bg-accent py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover cursor-pointer"
      >
        {isLast ? "See results" : "Next →"}
      </button>
    </motion.div>
  );
}
