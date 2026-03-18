"use client";

import Button from "@/components/ui/Button";
import type { QuantumBoxState, QuantumBoxAction } from "./types";
import { computeWaveNumbers } from "@/lib/physics/quantum";

interface QuantumControlsProps {
  state: QuantumBoxState;
  dispatch: React.Dispatch<QuantumBoxAction>;
  totalProb: number;
  onReset: () => void;
}

export default function QuantumControls({
  state,
  dispatch,
  totalProb,
  onReset,
}: QuantumControlsProps) {
  const V0 = state.showBarrier ? state.barrierHeight : 0;
  const wn = computeWaveNumbers(state.k0, V0);

  return (
    <div className="flex flex-col gap-4">
      {/* Playback controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => dispatch({ type: "TOGGLE_RUNNING" })}
          variant="primary"
          size="sm"
        >
          {state.running ? "Pause" : "Play"}
        </Button>
        <Button onClick={onReset} variant="secondary" size="sm">
          Reset
        </Button>
        <div className="h-6 w-px bg-border" />
        <label className="flex items-center gap-1.5 text-xs text-text-muted">
          Speed:
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={state.speed}
            onChange={(e) =>
              dispatch({ type: "SET_SPEED", value: Number(e.target.value) })
            }
            className="w-20 accent-accent"
          />
          <span className="w-6 font-mono">{state.speed}</span>
        </label>
        <div className="h-6 w-px bg-border" />
        <span className="text-xs text-text-muted">
          P = {totalProb.toFixed(4)}
        </span>
        <div className="h-6 w-px bg-border" />
        <label className="flex items-center gap-1.5 text-xs text-text-muted">
          <span>Mode:</span>
          <select
            value={state.mode}
            onChange={(e) => dispatch({ type: "SET_MODE", mode: e.target.value as "packet" | "plane" })}
            className="cursor-pointer rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground"
          >
            <option value="packet">Wave Packet</option>
            <option value="plane">Plane Wave</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Wave parameters */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {state.mode === "packet" ? "Wave Packet" : "Plane Wave"}
          </h3>
          <div className="space-y-3 text-xs">
            {state.mode === "packet" && (
              <>
                <div>
                  <label className="mb-1 flex items-center justify-between text-text-muted">
                    <span>Position (x₀)</span>
                    <span className="font-mono">{state.x0.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.45"
                    step="0.01"
                    value={state.x0}
                    onChange={(e) =>
                      dispatch({ type: "SET_X0", value: Number(e.target.value) })
                    }
                    className="w-full accent-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center justify-between text-text-muted">
                    <span>Width (σ)</span>
                    <span className="font-mono">{state.sigma.toFixed(3)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.02"
                    max="0.12"
                    step="0.005"
                    value={state.sigma}
                    onChange={(e) =>
                      dispatch({ type: "SET_SIGMA", value: Number(e.target.value) })
                    }
                    className="w-full accent-accent"
                  />
                </div>
              </>
            )}
            <div>
              <label className="mb-1 flex items-center justify-between text-text-muted">
                <span>Wavenumber k₁</span>
                <span className="font-mono">{state.k0.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="2"
                max="30"
                step="0.5"
                value={state.k0}
                onChange={(e) =>
                  dispatch({ type: "SET_K0", value: Number(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>
          </div>

          {/* Wave number display */}
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-400">k₁ (incident)</span>
              <span className="font-mono text-foreground">{wn.k1.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">E = ℏ²k₁²/2m</span>
              <span className="font-mono text-foreground">{wn.E.toFixed(2)}</span>
            </div>
            {wn.regime === "above" && wn.k2 !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-400">k₂ (transmitted)</span>
                <span className="font-mono text-foreground">{wn.k2.toFixed(2)}</span>
              </div>
            )}
            {wn.regime === "below" && wn.kappa2 !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400">κ₂ (evanescent)</span>
                <span className="font-mono text-foreground">{wn.kappa2.toFixed(2)}</span>
              </div>
            )}
            {wn.regime !== "no-barrier" && (
              <div className="mt-1 rounded bg-surface-hover px-2 py-1 text-[10px]">
                {wn.regime === "above" ? (
                  <span className="text-green-400">E &gt; V₀ — transmission + partial reflection</span>
                ) : (
                  <span className="text-red-400">E &lt; V₀ — evanescent tunnelling</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barrier */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Potential Barrier</h3>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={state.showBarrier}
                onChange={() => dispatch({ type: "TOGGLE_BARRIER" })}
                className="accent-accent"
              />
              Enable
            </label>
          </div>
          {state.showBarrier && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 flex items-center justify-between text-text-muted">
                  <span>Center</span>
                  <span className="font-mono">{state.barrierCenter.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="0.8"
                  step="0.01"
                  value={state.barrierCenter}
                  onChange={(e) =>
                    dispatch({ type: "SET_BARRIER_CENTER", value: Number(e.target.value) })
                  }
                  className="w-full accent-accent"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center justify-between text-text-muted">
                  <span>Width</span>
                  <span className="font-mono">{state.barrierWidth.toFixed(3)}</span>
                </label>
                <input
                  type="range"
                  min="0.005"
                  max="0.15"
                  step="0.005"
                  value={state.barrierWidth}
                  onChange={(e) =>
                    dispatch({ type: "SET_BARRIER_WIDTH", value: Number(e.target.value) })
                  }
                  className="w-full accent-accent"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center justify-between text-text-muted">
                  <span>Height (V₀)</span>
                  <span className="font-mono">{state.barrierHeight.toFixed(0)}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={state.barrierHeight}
                  onChange={(e) =>
                    dispatch({ type: "SET_BARRIER_HEIGHT", value: Number(e.target.value) })
                  }
                  className="w-full accent-accent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Display options */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Display</h3>
          <div className="space-y-2">
            {(
              [
                ["showProbability", "|ψ|²", "bg-purple-500/20 text-purple-400"],
                ["showReal", "Re(ψ)", "bg-blue-500/20 text-blue-400"],
                ["showImag", "Im(ψ)", "bg-orange-500/20 text-orange-400"],
                ["showPotential", "V(x)", "bg-gray-500/20 text-gray-400"],
              ] as const
            ).map(([field, label, badgeColor]) => (
              <label
                key={field}
                className="flex cursor-pointer items-center gap-2 text-xs text-text-muted"
              >
                <input
                  type="checkbox"
                  checked={state[field]}
                  onChange={() => dispatch({ type: "TOGGLE_SHOW", field })}
                  className="accent-accent"
                />
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeColor}`}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
