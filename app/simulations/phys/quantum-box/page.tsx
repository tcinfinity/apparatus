"use client";

import { useReducer, useRef, useState, useCallback, useEffect } from "react";
import SimulationNav from "@/components/layout/SimulationNav";
import WaveCanvas from "@/components/quantum-box/WaveCanvas";
import QuantumControls from "@/components/quantum-box/QuantumControls";
import HelpModal from "@/components/quantum-box/HelpModal";
import type {
  QuantumBoxState,
  QuantumBoxAction,
  Barrier,
} from "@/components/quantum-box/types";
import {
  initQuantumState,
  updatePotential,
  totalProbability,
  type QuantumState,
  type BarrierConfig,
} from "@/lib/physics/quantum";

const N = 2048;

let nextBarrierId = 1;
function makeBarrierId(): string {
  return `b${nextBarrierId++}`;
}

const defaultBarrier: Barrier = {
  id: makeBarrierId(),
  center: 0.5,
  width: 0.03,
  height: 200,
};

const initialParams: QuantumBoxState = {
  x0: 0.2,
  sigma: 0.06,
  k0: 12,
  energy: 72,
  amplitude: 1.0,
  barriers: [defaultBarrier],
  selectedBarrierId: defaultBarrier.id,
  leftWall: "none",
  rightWall: "none",
  leftWallHeight: 200,
  rightWallHeight: 200,
  mode: "packet",
  running: false,
  speed: 5,
  showReal: true,
  showImag: false,
  showProbability: true,
  showPotential: true,
  viewCenter: 0.5,
  viewScale: 1,
};

function reducer(
  state: QuantumBoxState,
  action: QuantumBoxAction
): QuantumBoxState {
  switch (action.type) {
    case "SET_X0":
      return { ...state, x0: action.value };
    case "SET_SIGMA":
      return { ...state, sigma: action.value };
    case "SET_K0":
      return {
        ...state,
        k0: action.value,
        energy: (action.value ** 2) / 2,
      };
    case "SET_SPEED":
      return { ...state, speed: action.value };
    case "SET_AMPLITUDE":
      return { ...state, amplitude: action.value };
    case "TOGGLE_RUNNING":
      return { ...state, running: !state.running };
    case "TOGGLE_SHOW":
      return { ...state, [action.field]: !state[action.field] };
    case "ADD_BARRIER":
      return {
        ...state,
        barriers: [...state.barriers, action.barrier],
        selectedBarrierId: action.barrier.id,
      };
    case "REMOVE_BARRIER": {
      const barriers = state.barriers.filter((b) => b.id !== action.id);
      return {
        ...state,
        barriers,
        selectedBarrierId:
          state.selectedBarrierId === action.id
            ? barriers.length > 0
              ? barriers[0].id
              : null
            : state.selectedBarrierId,
      };
    }
    case "SELECT_BARRIER":
      return { ...state, selectedBarrierId: action.id };
    case "UPDATE_BARRIER":
      return {
        ...state,
        barriers: state.barriers.map((b) =>
          b.id === action.id ? { ...b, [action.field]: action.value } : b
        ),
      };
    case "SET_LEFT_WALL":
      return { ...state, leftWall: action.wall };
    case "SET_RIGHT_WALL":
      return { ...state, rightWall: action.wall };
    case "SET_LEFT_WALL_HEIGHT":
      return { ...state, leftWallHeight: action.value };
    case "SET_RIGHT_WALL_HEIGHT":
      return { ...state, rightWallHeight: action.value };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_VIEW":
      return { ...state, viewCenter: action.center, viewScale: action.scale };
    case "RESET":
      return state;
    case "RESET_SETTINGS": {
      const newBarrier: Barrier = {
        id: makeBarrierId(),
        center: 0.5,
        width: 0.03,
        height: 200,
      };
      return {
        ...initialParams,
        barriers: [newBarrier],
        selectedBarrierId: newBarrier.id,
      };
    }
    default:
      return state;
  }
}

function buildQuantumState(params: QuantumBoxState): QuantumState {
  return initQuantumState(
    N,
    params.x0,
    params.sigma,
    params.k0,
    params.barriers as BarrierConfig[],
    params.leftWall,
    params.rightWall,
    params.leftWallHeight,
    params.rightWallHeight,
    params.mode,
    params.amplitude
  );
}

export default function QuantumBoxPage() {
  const [params, dispatch] = useReducer(reducer, initialParams);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prob, setProb] = useState(1);
  const qStateRef = useRef<QuantumState | null>(null);

  if (!qStateRef.current) {
    qStateRef.current = buildQuantumState(params);
  }

  // Live update potential when barrier/wall parameters change
  useEffect(() => {
    if (!qStateRef.current) return;
    updatePotential(
      qStateRef.current,
      params.barriers as BarrierConfig[],
      params.leftWall,
      params.rightWall,
      params.leftWallHeight,
      params.rightWallHeight
    );
  }, [
    params.barriers,
    params.leftWall,
    params.rightWall,
    params.leftWallHeight,
    params.rightWallHeight,
  ]);

  const handleRestartWave = useCallback(() => {
    qStateRef.current = buildQuantumState(params);
    setProb(1);
  }, [params]);

  const handleResetAll = useCallback(() => {
    dispatch({ type: "RESET_SETTINGS" });
    // Build with initial defaults (fresh barrier)
    const newBarrier: Barrier = {
      id: makeBarrierId(),
      center: 0.5,
      width: 0.03,
      height: 200,
    };
    const resetParams = {
      ...initialParams,
      barriers: [newBarrier],
      selectedBarrierId: newBarrier.id,
    };
    qStateRef.current = buildQuantumState(resetParams);
    setProb(1);
  }, []);

  const handleAddBarrier = useCallback(() => {
    const newBarrier: Barrier = {
      id: makeBarrierId(),
      center: 0.6,
      width: 0.03,
      height: 200,
    };
    dispatch({ type: "ADD_BARRIER", barrier: newBarrier });
  }, []);

  const handleTick = useCallback(() => {
    if (qStateRef.current) {
      setProb(totalProbability(qStateRef.current));
    }
  }, []);

  const handleViewChange = useCallback(
    (center: number, scale: number) => {
      dispatch({ type: "SET_VIEW", center, scale });
    },
    []
  );

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
          viewCenter={params.viewCenter}
          viewScale={params.viewScale}
          onViewChange={handleViewChange}
          x0={params.x0}
          sigma={params.sigma}
          mode={params.mode}
          barriers={params.barriers}
          selectedBarrierId={params.selectedBarrierId}
          leftWall={params.leftWall}
          rightWall={params.rightWall}
        />

        <QuantumControls
          state={params}
          dispatch={dispatch}
          totalProb={prob}
          onRestartWave={handleRestartWave}
          onResetAll={handleResetAll}
          onAddBarrier={handleAddBarrier}
        />
      </main>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
