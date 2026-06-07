import type { GameMode, QuestionResult } from "@/components/pka-game/types";

export interface CompoundRecord {
  correct: number;
  wrong: number;
}

export interface SessionSummary {
  date: string;
  score: number;
  total: number;
  correct: number;
  mode: GameMode;
  scoringMode: string;
  durationMs: number | null;
}

export interface PkaStats {
  version: 1;
  totalAnswered: number;
  totalCorrect: number;
  perCompound: Record<string, CompoundRecord>;
  sessions: SessionSummary[];
}

const KEY = "pka-game-stats";
const MAX_SESSIONS = 50;

function defaultStats(): PkaStats {
  return { version: 1, totalAnswered: 0, totalCorrect: 0, perCompound: {}, sessions: [] };
}

export function loadStats(): PkaStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as PkaStats;
    if (parsed.version !== 1) return defaultStats();
    return parsed;
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats: PkaStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // quota exceeded or private browsing
  }
}

export function recordSession(
  results: QuestionResult[],
  mode: GameMode,
  scoringMode: string,
  durationMs: number | null,
): void {
  const stats = loadStats();
  for (const r of results) {
    if (!stats.perCompound[r.entryId]) {
      stats.perCompound[r.entryId] = { correct: 0, wrong: 0 };
    }
    stats.totalAnswered++;
    if (r.correct) {
      stats.perCompound[r.entryId].correct++;
      stats.totalCorrect++;
    } else {
      stats.perCompound[r.entryId].wrong++;
    }
  }
  const summary: SessionSummary = {
    date: new Date().toISOString(),
    score: results.reduce((a, r) => a + r.pointsEarned, 0),
    total: results.length,
    correct: results.filter((r) => r.correct).length,
    mode,
    scoringMode,
    durationMs,
  };
  stats.sessions = [summary, ...stats.sessions].slice(0, MAX_SESSIONS);
  saveStats(stats);
}

export function clearStats(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
