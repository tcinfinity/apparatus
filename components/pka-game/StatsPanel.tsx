"use client";

import { useMemo } from "react";
import Modal from "@/components/ui/Modal";
import { loadStats, clearStats } from "@/lib/chem/pka-stats";
import { PKA_DATA } from "@/lib/chem/pka-data";

interface Props {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
}

export default function StatsPanel({ open, onClose, onClear }: Props) {
  const stats = useMemo(() => (open ? loadStats() : null), [open]);

  if (!stats) return null;

  const accuracy =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : null;

  // Top 5 most-missed compounds
  const mostMissed = Object.entries(stats.perCompound)
    .map(([id, rec]) => ({ id, ...rec }))
    .filter((r) => r.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 5)
    .map((r) => ({
      ...r,
      entry: PKA_DATA.find((e) => e.id === r.id),
    }));

  const recentSessions = stats.sessions.slice(0, 10);

  function handleClear() {
    clearStats();
    onClear();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-foreground">Statistics</h2>

        {stats.totalAnswered === 0 ? (
          <p className="text-sm text-text-muted">No data yet — complete a quiz first.</p>
        ) : (
          <>
            {/* Overall accuracy */}
            <section>
              <div className="flex items-end justify-between">
                <span className="text-sm text-text-muted">Overall accuracy</span>
                <span className="text-2xl font-bold text-foreground">{accuracy}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${accuracy ?? 0}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-text-muted">
                <span>{stats.totalCorrect} correct</span>
                <span>{stats.totalAnswered} answered</span>
              </div>
            </section>

            {/* Most missed */}
            {mostMissed.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Most missed
                </h3>
                <div className="space-y-1">
                  {mostMissed.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium text-foreground">
                          {r.entry?.name ?? r.id}
                        </span>
                        {r.entry && (
                          <span className="ml-2 text-xs text-text-muted">
                            pK<sub>a</sub> {r.entry.pkaDisplay}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-400">{r.correct}✓</span>
                        <span className="text-red-400">{r.wrong}✗</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Recent sessions
                </h3>
                <div className="space-y-1">
                  {recentSessions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs"
                    >
                      <div className="text-text-muted">
                        {new Date(s.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        <span className="capitalize">{s.mode}</span>
                        {" · "}
                        {s.scoringMode}
                      </div>
                      <div className="font-medium text-foreground">
                        {s.correct}/{s.total}
                        {s.score > 0 && (
                          <span className="ml-2 text-accent">{s.score}pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Clear button */}
        {stats.totalAnswered > 0 && (
          <button
            onClick={handleClear}
            className="w-full rounded-lg border border-red-500/30 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 cursor-pointer"
          >
            Clear all statistics
          </button>
        )}
      </div>
    </Modal>
  );
}
