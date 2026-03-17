import type { BarrierConfig } from "@/lib/physics/quantum";

export interface QuantumBoxState {
  // Wave packet initial conditions
  x0: number; // center position (0..1 fraction of L)
  sigma: number; // width (fraction of L)
  k0: number; // initial momentum

  // Box parameters
  barriers: BarrierConfig[];
  wallHeight: number;

  // Simulation control
  running: boolean;
  speed: number; // dt multiplier
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
  | { type: "ADD_BARRIER" }
  | { type: "REMOVE_BARRIER"; index: number }
  | { type: "UPDATE_BARRIER"; index: number; updates: Partial<BarrierConfig> }
  | { type: "SET_WALL_HEIGHT"; value: number }
  | { type: "RESET" };
