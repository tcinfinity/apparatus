/**
 * Quantum mechanics utilities for 1D particle in a box with potential barrier.
 *
 * Split-operator FFT method for time-dependent Schrödinger equation.
 * Units: ℏ = 1, m = 1 (natural units).
 */

// Simple radix-2 FFT (in-place, Cooley–Tukey)
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
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const vIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
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

export interface BarrierConfig {
  center: number;
  width: number;
  height: number;
}

export interface QuantumState {
  N: number;
  L: number;
  dx: number;
  psiRe: Float64Array;
  psiIm: Float64Array;
  potential: Float64Array;
}

export function createPotential(
  N: number,
  L: number,
  barrier: BarrierConfig | null,
  wallHeight: number
): Float64Array {
  const V = new Float64Array(N);
  const dx = L / N;

  // Hard walls at boundaries
  for (let i = 0; i < 3; i++) {
    V[i] = wallHeight;
    V[N - 1 - i] = wallHeight;
  }

  // Barrier
  if (barrier) {
    const bStart = (barrier.center - barrier.width / 2) * L;
    const bEnd = (barrier.center + barrier.width / 2) * L;
    for (let i = 3; i < N - 3; i++) {
      const x = i * dx;
      if (x >= bStart && x <= bEnd) {
        V[i] = barrier.height;
      }
    }
  }

  return V;
}

export function createGaussianWavePacket(
  N: number,
  L: number,
  x0: number,
  sigma: number,
  k0: number
): { re: Float64Array; im: Float64Array } {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const dx = L / N;
  const sigmaAbs = sigma * L;
  const x0Abs = x0 * L;

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
      re[i] /= norm;
      im[i] /= norm;
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

  // Windowed plane wave: envelope near left side, tapering at walls
  for (let i = 0; i < N; i++) {
    const x = i * dx;
    const frac = x / L;
    // Smooth envelope: ramps up from left wall, constant in middle, ramps down at right
    const env = Math.sin(Math.PI * frac) ** 0.3;
    re[i] = amplitude * env * Math.cos(k0 * x);
    im[i] = amplitude * env * Math.sin(k0 * x);
  }

  // Enforce walls
  re[0] = im[0] = 0;
  re[N - 1] = im[N - 1] = 0;

  // Normalize
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

export function initQuantumState(
  N: number,
  L: number,
  x0: number,
  sigma: number,
  k0: number,
  barrier: BarrierConfig | null,
  wallHeight: number,
  mode: "packet" | "plane"
): QuantumState {
  const dx = L / N;
  const potential = createPotential(N, L, barrier, wallHeight);
  const { re, im } = mode === "packet"
    ? createGaussianWavePacket(N, L, x0, sigma, k0)
    : createPlaneWave(N, L, k0, 1.0);

  return { N, L, dx, psiRe: re, psiIm: im, potential };
}

/**
 * Split-operator time evolution: one step of size dt.
 */
export function evolve(state: QuantumState, dt: number): void {
  const { N, L, psiRe, psiIm, potential } = state;

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

  // Hard-wall BCs
  psiRe[0] = psiIm[0] = 0;
  psiRe[N - 1] = psiIm[N - 1] = 0;
}

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

/**
 * Compute wave numbers for display.
 * k₁ = incident, k₂ = transmitted (real if E > V), κ₂ = evanescent (if E < V).
 */
export function computeWaveNumbers(k1: number, V0: number): {
  k1: number;
  E: number;
  k2: number | null;
  kappa2: number | null;
  regime: "above" | "below" | "no-barrier";
} {
  const E = (k1 * k1) / 2; // ℏ=1, m=1: E = ℏ²k²/(2m)
  if (V0 <= 0) {
    return { k1, E, k2: null, kappa2: null, regime: "no-barrier" };
  }
  if (E > V0) {
    // E > V₀: transmitted wave has real k₂ = √(2m(E-V₀))/ℏ
    const k2 = Math.sqrt(2 * (E - V0));
    return { k1, E, k2, kappa2: null, regime: "above" };
  } else {
    // E < V₀: evanescent κ₂ = √(2m(V₀-E))/ℏ
    const kappa2 = Math.sqrt(2 * (V0 - E));
    return { k1, E, k2: null, kappa2, regime: "below" };
  }
}
