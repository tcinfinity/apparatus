/**
 * Quantum mechanics utilities for 1D scattering simulation.
 *
 * Split-operator FFT method for time-dependent Schrödinger equation.
 * Units: ℏ = 1, m = 1 (natural units).
 */

/* ── Domain constants ─────────────────────────────────────────────── */
export const L_COMP = 14; // computational domain length
export const ABSORB_WIDTH = 2; // absorbing region on each side
export const VIS_LEFT = ABSORB_WIDTH; // = 1
export const VIS_RIGHT = L_COMP - ABSORB_WIDTH; // = 11
export const L_VIS = VIS_RIGHT - VIS_LEFT; // = 10

/** Convert user coordinate [0, 1] → absolute computational coordinate */
export function userToAbs(u: number): number {
  return VIS_LEFT + u * L_VIS;
}

/** Convert absolute computational coordinate → user coordinate [0, 1] */
export function absToUser(a: number): number {
  return (a - VIS_LEFT) / L_VIS;
}

/* ── FFT ──────────────────────────────────────────────────────────── */

function fft(re: Float64Array, im: Float64Array, invert: boolean) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = ((2 * Math.PI) / len) * (invert ? -1 : 1);
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1,
        curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe =
          re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const vIm =
          re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }

  if (invert) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/* ── Types ────────────────────────────────────────────────────────── */

export interface BarrierConfig {
  id: string;
  center: number; // fraction of visible domain [0, 1]
  width: number; // fraction of visible domain
  height: number; // V₀ in energy units
}

export type WallType = "none" | "infinite" | "finite";

export interface QuantumState {
  N: number;
  L: number;
  dx: number;
  psiRe: Float64Array;
  psiIm: Float64Array;
  potential: Float64Array;
  absorbing: Float64Array;
  leftWall: WallType;
  rightWall: WallType;
  leftWallPos: number; // user coord [0, 1]
  rightWallPos: number; // user coord [0, 1]
}

/* ── Potential ────────────────────────────────────────────────────── */

function createAbsorbing(
  N: number,
  L: number,
  leftWall: WallType,
  rightWall: WallType
): Float64Array {
  const absorb = new Float64Array(N);
  const dx = L / N;
  const gammaMax = 500;
  // Absorbing zone extends from computational edge INTO the visible domain
  // by 10% on each side, so the wave smoothly fades before going off-screen.
  const visOverlap = L_VIS * 0.1;
  const leftEdge = VIS_LEFT + visOverlap; // abs coord where absorption fades to 0
  const rightEdge = VIS_RIGHT - visOverlap; // abs coord where absorption starts

  for (let i = 0; i < N; i++) {
    const x = i * dx;
    // Left absorber (ramps from 0 at leftEdge to gammaMax at x=0)
    if (leftWall === "none" && x < leftEdge) {
      const frac = (leftEdge - x) / leftEdge;
      absorb[i] = gammaMax * frac * frac * frac; // cubic for smooth onset
    }
    // Right absorber
    if (rightWall === "none" && x > rightEdge) {
      const frac = (x - rightEdge) / (L - rightEdge);
      absorb[i] = gammaMax * frac * frac * frac;
    }
  }

  return absorb;
}

export function createPotential(
  N: number,
  L: number,
  barriers: BarrierConfig[],
  leftWall: WallType,
  rightWall: WallType,
  leftWallHeight: number,
  rightWallHeight: number,
  leftWallPos: number = 0,
  rightWallPos: number = 1
): Float64Array {
  const V = new Float64Array(N);
  const dx = L / N;

  // Walls: finite walls are narrow potential steps at the wall position
  if (leftWall === "finite") {
    const wallAbs = userToAbs(leftWallPos);
    for (let i = 0; i < N; i++) {
      const x = i * dx;
      if (x <= wallAbs + dx * 2) {
        const d = wallAbs + dx * 2 - x;
        const frac = Math.min(1, d / (dx * 2));
        V[i] = Math.max(V[i], leftWallHeight * frac);
      }
    }
  }
  if (rightWall === "finite") {
    const wallAbs = userToAbs(rightWallPos);
    for (let i = 0; i < N; i++) {
      const x = i * dx;
      if (x >= wallAbs - dx * 2) {
        const d = x - (wallAbs - dx * 2);
        const frac = Math.min(1, d / (dx * 2));
        V[i] = Math.max(V[i], rightWallHeight * frac);
      }
    }
  }

  // Barriers with steep sigmoid edges (nearly rectangular)
  for (const barrier of barriers) {
    const bCenter = userToAbs(barrier.center);
    const bHalfWidth = (barrier.width / 2) * L_VIS;
    // Tight sigmoid: transition over ~2 grid points
    const sigmoidScale = Math.max(dx * 0.5, 0.001);

    for (let i = 0; i < N; i++) {
      const x = i * dx;
      const distFromCenter = Math.abs(x - bCenter);
      const edgeDist = distFromCenter - bHalfWidth;
      const sigmoid = 1 / (1 + Math.exp(edgeDist / sigmoidScale));
      V[i] = Math.max(V[i], barrier.height * sigmoid);
    }
  }

  return V;
}

/** Update potential in-place on an existing quantum state. */
export function updatePotential(
  state: QuantumState,
  barriers: BarrierConfig[],
  leftWall: WallType,
  rightWall: WallType,
  leftWallHeight: number,
  rightWallHeight: number,
  leftWallPos: number = 0,
  rightWallPos: number = 1
): void {
  const newV = createPotential(
    state.N,
    state.L,
    barriers,
    leftWall,
    rightWall,
    leftWallHeight,
    rightWallHeight,
    leftWallPos,
    rightWallPos
  );
  state.potential.set(newV);
  const newAbsorb = createAbsorbing(state.N, state.L, leftWall, rightWall);
  state.absorbing.set(newAbsorb);
  state.leftWall = leftWall;
  state.rightWall = rightWall;
  state.leftWallPos = leftWallPos;
  state.rightWallPos = rightWallPos;
}

/* ── Wave functions ───────────────────────────────────────────────── */

export function createGaussianWavePacket(
  N: number,
  L: number,
  x0: number,
  sigma: number,
  k0: number,
  amplitude: number = 1.0
): { re: Float64Array; im: Float64Array } {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const dx = L / N;
  // x0 and sigma are in user coords [0,1]; convert to absolute
  const x0Abs = userToAbs(x0);
  const sigmaAbs = sigma * L_VIS;

  let norm = 0;
  for (let i = 0; i < N; i++) {
    const x = i * dx;
    const gauss = Math.exp(-((x - x0Abs) ** 2) / (2 * sigmaAbs ** 2));
    re[i] = gauss * Math.cos(k0 * x);
    im[i] = gauss * Math.sin(k0 * x);
    norm += re[i] ** 2 + im[i] ** 2;
  }

  norm = Math.sqrt(norm * dx);
  if (norm > 0) {
    for (let i = 0; i < N; i++) {
      re[i] = (re[i] / norm) * amplitude;
      im[i] = (im[i] / norm) * amplitude;
    }
  }

  return { re, im };
}

export function createPlaneWave(
  N: number,
  L: number,
  k0: number,
  amplitude: number
): { re: Float64Array; im: Float64Array } {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const dx = L / N;

  for (let i = 0; i < N; i++) {
    const x = i * dx;
    // Smooth envelope: ramps up/down in absorbing region
    const fromLeft = x / ABSORB_WIDTH;
    const fromRight = (L - x) / ABSORB_WIDTH;
    const env =
      Math.min(1, Math.max(0, fromLeft)) *
      Math.min(1, Math.max(0, fromRight));
    re[i] = amplitude * env * Math.cos(k0 * x);
    im[i] = amplitude * env * Math.sin(k0 * x);
  }

  let norm = 0;
  for (let i = 0; i < N; i++) {
    norm += re[i] ** 2 + im[i] ** 2;
  }
  norm = Math.sqrt(norm * dx);
  if (norm > 0) {
    for (let i = 0; i < N; i++) {
      re[i] /= norm;
      im[i] /= norm;
    }
  }

  return { re, im };
}

/* ── State initialization ─────────────────────────────────────────── */

export function initQuantumState(
  N: number,
  x0: number,
  sigma: number,
  k0: number,
  barriers: BarrierConfig[],
  leftWall: WallType,
  rightWall: WallType,
  leftWallHeight: number,
  rightWallHeight: number,
  mode: "packet" | "plane",
  amplitude: number = 1.0,
  leftWallPos: number = 0,
  rightWallPos: number = 1
): QuantumState {
  const L = L_COMP;
  const dx = L / N;
  const potential = createPotential(
    N,
    L,
    barriers,
    leftWall,
    rightWall,
    leftWallHeight,
    rightWallHeight,
    leftWallPos,
    rightWallPos
  );
  const absorbing = createAbsorbing(N, L, leftWall, rightWall);
  const { re, im } =
    mode === "packet"
      ? createGaussianWavePacket(N, L, x0, sigma, k0, amplitude)
      : createPlaneWave(N, L, k0, amplitude);

  return {
    N,
    L,
    dx,
    psiRe: re,
    psiIm: im,
    potential,
    absorbing,
    leftWall,
    rightWall,
    leftWallPos,
    rightWallPos,
  };
}

/* ── Time evolution ───────────────────────────────────────────────── */

export function evolve(state: QuantumState, dt: number): void {
  const { N, L, psiRe, psiIm, potential, absorbing, leftWall, rightWall } =
    state;

  // Half-step potential
  for (let i = 0; i < N; i++) {
    const phase = -potential[i] * dt * 0.5;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    const r = psiRe[i];
    const im = psiIm[i];
    psiRe[i] = r * c - im * s;
    psiIm[i] = r * s + im * c;
  }

  // FFT to momentum space
  fft(psiRe, psiIm, false);

  // Full-step kinetic
  const dk = (2 * Math.PI) / L;
  for (let i = 0; i < N; i++) {
    const ki = i <= N / 2 ? i * dk : (i - N) * dk;
    const phase = -(ki * ki * 0.5) * dt;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    const r = psiRe[i];
    const im = psiIm[i];
    psiRe[i] = r * c - im * s;
    psiIm[i] = r * s + im * c;
  }

  // IFFT back
  fft(psiRe, psiIm, true);

  // Half-step potential
  for (let i = 0; i < N; i++) {
    const phase = -potential[i] * dt * 0.5;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    const r = psiRe[i];
    const im = psiIm[i];
    psiRe[i] = r * c - im * s;
    psiIm[i] = r * s + im * c;
  }

  // Absorbing boundary conditions (smooth damping near edges)
  for (let i = 0; i < N; i++) {
    if (absorbing[i] > 0) {
      const damp = Math.exp(-absorbing[i] * dt);
      psiRe[i] *= damp;
      psiIm[i] *= damp;
    }
  }

  // Enforce infinite wall BCs at wall positions
  if (leftWall === "infinite") {
    const wallAbs = userToAbs(state.leftWallPos);
    const wallIdx = Math.ceil((wallAbs / L) * N);
    for (let i = 0; i <= wallIdx; i++) {
      psiRe[i] = 0;
      psiIm[i] = 0;
    }
  }
  if (rightWall === "infinite") {
    const wallAbs = userToAbs(state.rightWallPos);
    const wallIdx = Math.floor((wallAbs / L) * N);
    for (let i = wallIdx; i < N; i++) {
      psiRe[i] = 0;
      psiIm[i] = 0;
    }
  }
}

/* ── Observables ──────────────────────────────────────────────────── */

export function probabilityDensity(state: QuantumState): Float64Array {
  const { N, psiRe, psiIm } = state;
  const pd = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    pd[i] = psiRe[i] ** 2 + psiIm[i] ** 2;
  }
  return pd;
}

export function totalProbability(state: QuantumState): number {
  const { N, dx, psiRe, psiIm } = state;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    sum += psiRe[i] ** 2 + psiIm[i] ** 2;
  }
  return sum * dx;
}

/* ── Wave number display ──────────────────────────────────────────── */

export function computeWaveNumbers(
  k1: number,
  V0: number
): {
  k1: number;
  E: number;
  k2: number | null;
  kappa2: number | null;
  regime: "above" | "below" | "no-barrier";
} {
  const E = (k1 * k1) / 2;
  if (V0 <= 0) {
    return { k1, E, k2: null, kappa2: null, regime: "no-barrier" };
  }
  if (E > V0) {
    const k2 = Math.sqrt(2 * (E - V0));
    return { k1, E, k2, kappa2: null, regime: "above" };
  } else {
    const kappa2 = Math.sqrt(2 * (V0 - E));
    return { k1, E, k2: null, kappa2, regime: "below" };
  }
}
