/**
 * Quantum mechanics utilities for a 1D particle in a box with potential barriers.
 *
 * Uses a split-operator FFT method to evolve a Gaussian wave packet
 * in a 1D potential. The spatial grid has N points over [0, L].
 *
 * Units: ℏ = 1, m = 1 (natural units). Energy in units of ℏ²/(2mL²).
 */

// Simple radix-2 FFT (in-place, Cooley–Tukey)
function fft(re: Float64Array, im: Float64Array, invert: boolean) {
  const n = re.length;
  // bit-reversal permutation
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

export interface QuantumState {
  N: number; // grid points (power of 2)
  L: number; // box length
  dx: number;
  psiRe: Float64Array;
  psiIm: Float64Array;
  potential: Float64Array; // V(x)
}

export interface BarrierConfig {
  center: number; // fraction of L (0..1)
  width: number; // fraction of L
  height: number; // in energy units
}

export function createPotential(
  N: number,
  L: number,
  barriers: BarrierConfig[],
  wallHeight: number
): Float64Array {
  const V = new Float64Array(N);
  const dx = L / N;

  for (let i = 0; i < N; i++) {
    const x = i * dx;

    // Hard walls at boundaries
    if (i < 3 || i >= N - 3) {
      V[i] = wallHeight;
      continue;
    }

    // Barriers
    for (const b of barriers) {
      const bStart = (b.center - b.width / 2) * L;
      const bEnd = (b.center + b.width / 2) * L;
      if (x >= bStart && x <= bEnd) {
        V[i] = Math.max(V[i], b.height);
      }
    }
  }

  return V;
}

export function createGaussianWavePacket(
  N: number,
  L: number,
  x0: number, // center position (fraction of L)
  sigma: number, // width (fraction of L)
  k0: number // initial momentum
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

  // Normalize
  norm = Math.sqrt(norm * dx);
  for (let i = 0; i < N; i++) {
    re[i] /= norm;
    im[i] /= norm;
  }

  return { re, im };
}

export function initQuantumState(
  N: number,
  L: number,
  x0: number,
  sigma: number,
  k0: number,
  barriers: BarrierConfig[],
  wallHeight: number
): QuantumState {
  const dx = L / N;
  const potential = createPotential(N, L, barriers, wallHeight);
  const { re, im } = createGaussianWavePacket(N, L, x0, sigma, k0);

  return {
    N,
    L,
    dx,
    psiRe: re,
    psiIm: im,
    potential,
  };
}

/**
 * Split-operator time evolution: one step of size dt.
 *
 * Ψ(t+dt) ≈ exp(-iV dt/2) · IFFT[ exp(-ik² dt/2) · FFT[ exp(-iV dt/2) · Ψ(t) ] ]
 *
 * In natural units (ℏ=1, m=1): kinetic = k²/2.
 */
export function evolve(state: QuantumState, dt: number): void {
  const { N, L, dx, psiRe, psiIm, potential } = state;

  // Half-step potential: multiply by exp(-i V dt/2)
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

  // Full-step kinetic: multiply by exp(-i k² dt/2)
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

  // IFFT back to position space
  fft(psiRe, psiIm, true);

  // Half-step potential again
  for (let i = 0; i < N; i++) {
    const phase = -potential[i] * dt * 0.5;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    const r = psiRe[i];
    const im = psiIm[i];
    psiRe[i] = r * c - im * s;
    psiIm[i] = r * s + im * c;
  }

  // Enforce hard-wall boundary conditions
  psiRe[0] = psiIm[0] = 0;
  psiRe[N - 1] = psiIm[N - 1] = 0;
}

/** Compute probability density |ψ|² */
export function probabilityDensity(state: QuantumState): Float64Array {
  const { N, psiRe, psiIm } = state;
  const pd = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    pd[i] = psiRe[i] ** 2 + psiIm[i] ** 2;
  }
  return pd;
}

/** Compute total probability (should stay ≈ 1) */
export function totalProbability(state: QuantumState): number {
  const { N, dx, psiRe, psiIm } = state;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    sum += psiRe[i] ** 2 + psiIm[i] ** 2;
  }
  return sum * dx;
}
