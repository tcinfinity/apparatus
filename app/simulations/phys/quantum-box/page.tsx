"use client";

import { useReducer, useRef, useState, useCallback } from "react";
import SimulationNav from "@/components/layout/SimulationNav";
import WaveCanvas from "@/components/quantum-box/WaveCanvas";
import QuantumControls from "@/components/quantum-box/QuantumControls";
import HelpModal from "@/components/quantum-box/HelpModal";
import type { QuantumBoxState, QuantumBoxAction } from "@/components/quantum-box/types";
import { initQuantumState, totalProbability, type QuantumState } from "@/lib/physics/quantum";

const N = 1024;
const L = 10;

const initialParams: QuantumBoxState = {
  x0: 0.2,
  sigma: 0.06,
  k0: 12,
  energy: 72, // k²/2
  barrierCenter: 0.5,
  barrierWidth: 0.03,
  barrierHeight: 200,
  showBarrier: true,
  mode: "packet",
  running: false,
  speed: 5,
  showReal: true,
  showImag: false,
  showProbability: true,
  showPotential: true,
};

function reducer(state: QuantumBoxState, action: QuantumBoxAction): QuantumBoxState {
  switch (action.type) {
    case "SET_X0":
      return { ...state, x0: action.value };
    case "SET_SIGMA":
      return { ...state, sigma: action.value };
    case "SET_K0":
      return { ...state, k0: action.value, energy: (action.value ** 2) / 2 };
    case "SET_SPEED":
      return { ...state, speed: action.value };
    case "TOGGLE_RUNNING":
      return { ...state, running: !state.running };
    case "TOGGLE_SHOW":
      return { ...state, [action.field]: !state[action.field] };
    case "SET_BARRIER_CENTER":
      return { ...state, barrierCenter: action.value };
    case "SET_BARRIER_WIDTH":
      return { ...state, barrierWidth: action.value };
    case "SET_BARRIER_HEIGHT":
      return { ...state, barrierHeight: action.value };
    case "TOGGLE_BARRIER":
      return { ...state, showBarrier: !state.showBarrier };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "RESET":
      return { ...initialParams };
    default:
      return state;
  }
}

function buildQuantumState(params: QuantumBoxState): QuantumState {
  const barrier = params.showBarrier
    ? { center: params.barrierCenter, width: params.barrierWidth, height: params.barrierHeight }
    : null;
  return initQuantumState(N, L, params.x0, params.sigma, params.k0, barrier, 1e6, params.mode);
}

export default function QuantumBoxPage() {
  const [params, dispatch] = useReducer(reducer, initialParams);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prob, setProb] = useState(1);
  const qStateRef = useRef<QuantumState | null>(null);

  if (!qStateRef.current) {
    qStateRef.current = buildQuantumState(params);
  }

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    qStateRef.current = buildQuantumState(initialParams);
    setProb(1);
  }, []);

  const handleApply = useCallback(() => {
    qStateRef.current = buildQuantumState(params);
    setProb(1);
  }, [params]);

  const handleTick = useCallback(() => {
    if (qStateRef.current) {
      setProb(totalProbability(qStateRef.current));
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SimulationNav title="Quantum Particle in a Box" />

      <button
        onClick={() => setHelpOpen(true)}
        className="fixed right-4 top-16 z-40 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
        title="Help"
      >
        ?
      </button>

      <main className="flex flex-1 flex-col gap-4 p-4">
        <WaveCanvas
          quantumState={qStateRef.current}
          running={params.running}
          speed={params.speed}
          showReal={params.showReal}
          showImag={params.showImag}
          showProbability={params.showProbability}
          showPotential={params.showPotential}
          onTick={handleTick}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleApply}
            className="cursor-pointer rounded-md border border-accent/40 bg-accent-muted px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Apply &amp; Restart
          </button>
          <span className="text-xs text-text-muted">
            Adjust parameters then click Apply to restart the simulation
          </span>
        </div>

        <QuantumControls
          state={params}
          dispatch={dispatch}
          totalProb={prob}
          onReset={handleReset}
        />
      </main>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
