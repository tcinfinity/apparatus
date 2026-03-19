export type WaveMode = "packet" | "plane";
export type WallType = "none" | "infinite" | "finite";

export interface Barrier {
  id: string;
  center: number; // fraction of visible domain [0, 1]
  width: number; // fraction of visible domain
  height: number; // V₀ energy units
}

export interface QuantumBoxState {
  // Wave initial conditions
  x0: number; // center position (fraction of visible domain)
  sigma: number; // width (fraction of visible domain)
  k0: number; // incident wavenumber k₁
  energy: number; // E = k₁²/2
  amplitude: number;

  // Barriers (multiple)
  barriers: Barrier[];
  selectedBarrierId: string | null;

  // Walls
  leftWall: WallType;
  rightWall: WallType;
  leftWallHeight: number;
  rightWallHeight: number;
  leftWallPos: number; // user coord [0, 1]
  rightWallPos: number; // user coord [0, 1]

  // Mode
  mode: WaveMode;

  // Simulation control
  running: boolean;
  speed: number;
  showReal: boolean;
  showImag: boolean;
  showProbability: boolean;
  showPotential: boolean;

  // View (zoom/pan)
  viewCenter: number; // center of view in user coords [0, 1]
  viewScale: number; // 1 = full domain, >1 = zoomed in
}

export type QuantumBoxAction =
  | { type: "SET_X0"; value: number }
  | { type: "SET_SIGMA"; value: number }
  | { type: "SET_K0"; value: number }
  | { type: "SET_SPEED"; value: number }
  | { type: "SET_AMPLITUDE"; value: number }
  | { type: "TOGGLE_RUNNING" }
  | {
      type: "TOGGLE_SHOW";
      field: "showReal" | "showImag" | "showProbability" | "showPotential";
    }
  | { type: "ADD_BARRIER"; barrier: Barrier }
  | { type: "REMOVE_BARRIER"; id: string }
  | { type: "SELECT_BARRIER"; id: string | null }
  | {
      type: "UPDATE_BARRIER";
      id: string;
      field: "center" | "width" | "height";
      value: number;
    }
  | { type: "SET_LEFT_WALL"; wall: WallType }
  | { type: "SET_RIGHT_WALL"; wall: WallType }
  | { type: "SET_LEFT_WALL_HEIGHT"; value: number }
  | { type: "SET_RIGHT_WALL_HEIGHT"; value: number }
  | { type: "SET_LEFT_WALL_POS"; value: number }
  | { type: "SET_RIGHT_WALL_POS"; value: number }
  | { type: "SET_MODE"; mode: WaveMode }
  | { type: "SET_VIEW"; center: number; scale: number }
  | { type: "RESET_SETTINGS" }
  | { type: "RESET" };
