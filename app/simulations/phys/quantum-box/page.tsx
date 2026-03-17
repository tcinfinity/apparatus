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
  x0: 0.25,
  sigma: 0.04,
  k0: 40,
  barriers: [],
  wallHeight: 1e6,
  running: false,
  speed: 3,
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
      return { ...state, k0: action.value };
    case "SET_SPEED":
      return { ...state, speed: action.value };
    case "TOGGLE_RUNNING":
      return { ...state, running: !state.running };
    case "TOGGLE_SHOW":
      return { ...state, [action.field]: !state[action.field] };
    case "ADD_BARRIER":
      return {
        ...state,
        barriers: [...state.barriers, { center: 0.5, width: 0.02, height: 500 }],
      };
    case "REMOVE_BARRIER":
      return {
        ...state,
        barriers: state.barriers.filter((_, i) => i !== action.index),
      };
    case "UPDATE_BARRIER":
      return {
        ...state,
        barriers: state.barriers.map((b, i) =>
          i === action.index ? { ...b, ...action.updates } : b
        ),
      };
    case "SET_WALL_HEIGHT":
      return { ...state, wallHeight: action.value };
    case "RESET":
      return { ...initialParams };
    default:
      return state;
  }
}

function buildQuantumState(params: QuantumBoxState): QuantumState {
  return initQuantumState(
    N,
    L,
    params.x0,
    params.sigma,
    params.k0,
    params.barriers,
    params.wallHeight
  );
}

export default function QuantumBoxPage() {
  const [params, dispatch] = useReducer(reducer, initialParams);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prob, setProb] = useState(1);
  const qStateRef = useRef<QuantumState | null>(null);

  // Initialize on first render
  if (!qStateRef.current) {
    qStateRef.current = buildQuantumState(params);
  }

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    qStateRef.current = buildQuantumState(initialParams);
    setProb(1);
  }, []);

  const handleResetWithParams = useCallback(() => {
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

        <div className="flex gap-2">
          <button
            onClick={handleResetWithParams}
            className="cursor-pointer rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-foreground"
          >
            Apply & Restart
          </button>
          <span className="self-center text-xs text-text-muted">
            Change wave packet parameters then click Apply to restart with new settings
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
