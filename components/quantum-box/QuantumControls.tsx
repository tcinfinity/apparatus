"use client";

import Button from "@/components/ui/Button";
import type { QuantumBoxState, QuantumBoxAction } from "./types";

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
        <span className="text-xs text-text-muted">
          Speed: {state.speed.toFixed(1)}x
        </span>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={state.speed}
          onChange={(e) =>
            dispatch({ type: "SET_SPEED", value: Number(e.target.value) })
          }
          className="w-24 accent-accent"
        />
        <div className="h-6 w-px bg-border" />
        <span className="text-xs text-text-muted">
          P = {totalProb.toFixed(4)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Wave packet parameters */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Wave Packet</h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block text-text-muted">
                Position (x₀): {state.x0.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.01"
                value={state.x0}
                onChange={(e) =>
                  dispatch({ type: "SET_X0", value: Number(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-text-muted">
                Width (σ): {state.sigma.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.01"
                max="0.15"
                step="0.005"
                value={state.sigma}
                onChange={(e) =>
                  dispatch({ type: "SET_SIGMA", value: Number(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-text-muted">
                Momentum (k₀): {state.k0.toFixed(1)}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={state.k0}
                onChange={(e) =>
                  dispatch({ type: "SET_K0", value: Number(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>

        {/* Display options + barriers */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Display</h3>
          <div className="mb-3 space-y-1.5">
            {(
              [
                ["showProbability", "|ψ|²", "bg-purple-500/20 text-purple-400"],
                ["showReal", "Re(ψ)", "bg-blue-500/20 text-blue-400"],
                ["showImag", "Im(ψ)", "bg-orange-500/20 text-orange-400"],
                ["showPotential", "V(x)", "bg-yellow-500/20 text-yellow-400"],
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

          <h3 className="mb-2 text-sm font-semibold">Barriers</h3>
          <div className="space-y-2">
            {state.barriers.map((b, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-background p-2"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">
                    Barrier {i + 1}
                  </span>
                  <button
                    onClick={() => dispatch({ type: "REMOVE_BARRIER", index: i })}
                    className="cursor-pointer text-xs text-red-400/60 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <label className="text-text-muted">
                      Center: {b.center.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.01"
                      value={b.center}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_BARRIER",
                          index: i,
                          updates: { center: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                  <div>
                    <label className="text-text-muted">
                      Width: {b.width.toFixed(3)}
                    </label>
                    <input
                      type="range"
                      min="0.005"
                      max="0.2"
                      step="0.005"
                      value={b.width}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_BARRIER",
                          index: i,
                          updates: { width: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                  <div>
                    <label className="text-text-muted">
                      Height: {b.height.toFixed(0)}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="2000"
                      step="10"
                      value={b.height}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_BARRIER",
                          index: i,
                          updates: { height: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              onClick={() => dispatch({ type: "ADD_BARRIER" })}
              variant="secondary"
              size="sm"
            >
              + Add Barrier
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
