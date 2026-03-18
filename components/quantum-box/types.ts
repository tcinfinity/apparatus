import type { BarrierConfig } from "@/lib/physics/quantum";

export type WaveMode = "packet" | "plane";

export interface QuantumBoxState {
  // Wave packet initial conditions
  x0: number;       // center position (fraction of L)
  sigma: number;    // width (fraction of L)
  k0: number;       // incident wavenumber k₁
  energy: number;   // E = ℏ²k₁²/(2m) — computed from k0

  // Barrier
  barrierCenter: number;  // fraction of L
  barrierWidth: number;   // fraction of L
  barrierHeight: number;  // V₀ in energy units
  showBarrier: boolean;

  // Mode
  mode: WaveMode;

  // Simulation control
  running: boolean;
  speed: number;
  showReal: boolean;
  showImag: boolean;
  showProbability: boolean;
  showPotential: boolean;
}

export type QuantumBoxAction =
  | { type: "SET_X0"; value: number }
  | { type: "SET_SIGMA"; value: number }
  | { type: "SET_K0"; value: number }
  | { type: "SET_SPEED"; value: number }
  | { type: "TOGGLE_RUNNING" }
  | { type: "TOGGLE_SHOW"; field: "showReal" | "showImag" | "showProbability" | "showPotential" }
  | { type: "SET_BARRIER_CENTER"; value: number }
  | { type: "SET_BARRIER_WIDTH"; value: number }
  | { type: "SET_BARRIER_HEIGHT"; value: number }
  | { type: "TOGGLE_BARRIER" }
  | { type: "SET_MODE"; mode: WaveMode }
  | { type: "RESET" };
