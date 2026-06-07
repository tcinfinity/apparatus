export type PkaCategory =
  | "mineral"   // HI, HBr, HCl, H2SO4, H3O+, tosic acid, HF
  | "oxygen"    // RCOOH, H2O, ROH, ArOH
  | "nitrogen"  // R3NH+, RNH2
  | "sulfur"    // RSH, sulfoxides
  | "carbon"    // malonates, ketones, nitriles, esters, alkynes, alkenes, alkanes
  | "other";    // H2

export interface PkaEntry {
  id: string;
  name: string;
  functionalGroup: string;
  smiles: string;         // [H:1] marks the acidic proton (atom class 1, highlighted red)
  pka: number;            // canonical / midpoint value used for scoring
  pkaDisplay: string;     // display string e.g. "−6", "20–24", "~35"
  categories: PkaCategory[];
  source: "basic" | "advanced";
  note?: string;          // brief hint shown after answering
}

export type ScoringMode = "closeness" | "tolerance";
export type GameMode = "classic" | "per-question" | "speed-run";
export type GamePhase = "SETUP" | "PLAYING" | "FEEDBACK" | "RESULTS";

export interface GameConfig {
  mode: GameMode;
  difficulty: "basic" | "advanced";
  categories: PkaCategory[];
  scoringMode: ScoringMode;
  tolerance: number;          // used in tolerance mode: 0.5 | 1.0 | 2.0
  speedRunSeconds: number;    // 60 | 120
}

export interface QuestionResult {
  entryId: string;
  userAnswer: number | null;  // null = time expired
  correct: boolean;           // depends on scoring mode
  deviation: number | null;   // |userAnswer - pka|
  pointsEarned: number;
  timeTakenMs: number | null;
}

export interface GameState {
  phase: GamePhase;
  config: GameConfig;
  pool: PkaEntry[];
  queueIndex: number;
  current: PkaEntry | null;
  questionStartTime: number | null;
  results: QuestionResult[];
  score: number;
  sessionStartTime: number | null;
}

export type GameAction =
  | { type: "START"; config: GameConfig }
  | { type: "ANSWER"; answer: number | null; timeTakenMs: number | null }
  | { type: "NEXT" }
  | { type: "TIME_UP" }
  | { type: "SPEED_RUN_END" }
  | { type: "RESTART" };
