"use client";

import Button from "@/components/ui/Button";
import type { QuantumBoxState, QuantumBoxAction, Barrier } from "./types";
import { computeWaveNumbers } from "@/lib/physics/quantum";

interface QuantumControlsProps {
  state: QuantumBoxState;
  dispatch: React.Dispatch<QuantumBoxAction>;
  totalProb: number;
  onRestartWave: () => void;
  onResetAll: () => void;
  onAddBarrier: () => void;
}

export default function QuantumControls({
  state,
  dispatch,
  totalProb,
  onRestartWave,
  onResetAll,
  onAddBarrier,
}: QuantumControlsProps) {
  // Use selected barrier V₀ for wave number display, or first barrier
  const selectedBarrier = state.barriers.find(
    (b) => b.id === state.selectedBarrierId
  );
  const firstBarrier = state.barriers[0];
  const displayBarrier = selectedBarrier || firstBarrier;
  const V0 = displayBarrier ? displayBarrier.height : 0;
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
        <Button onClick={onRestartWave} variant="secondary" size="sm">
          Restart Wave
        </Button>
        <Button onClick={onResetAll} variant="secondary" size="sm">
          Reset All
        </Button>
        {state.viewScale !== 1 && (
          <Button
            onClick={() =>
              dispatch({ type: "SET_VIEW", center: 0.5, scale: 1 })
            }
            variant="secondary"
            size="sm"
          >
            Reset View
          </Button>
        )}
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
            onChange={(e) =>
              dispatch({
                type: "SET_MODE",
                mode: e.target.value as "packet" | "plane",
              })
            }
            className="cursor-pointer rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground"
          >
            <option value="packet">Wave Packet</option>
            <option value="plane">Plane Wave</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* ── Wave parameters ── */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {state.mode === "packet" ? "Wave Packet" : "Plane Wave"}
          </h3>
          <div className="space-y-3 text-xs">
            {state.mode === "packet" && (
              <>
                <SliderRow
                  label="Position (x₀)"
                  value={state.x0}
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  decimals={2}
                  onChange={(v) => dispatch({ type: "SET_X0", value: v })}
                />
                <SliderRow
                  label="Width (σ)"
                  value={state.sigma}
                  min={0.01}
                  max={0.15}
                  step={0.005}
                  decimals={3}
                  onChange={(v) => dispatch({ type: "SET_SIGMA", value: v })}
                />
              </>
            )}
            <SliderRow
              label="Wavenumber k₁"
              value={state.k0}
              min={2}
              max={30}
              step={0.5}
              decimals={1}
              onChange={(v) => dispatch({ type: "SET_K0", value: v })}
            />
            <SliderRow
              label="Amplitude"
              value={state.amplitude}
              min={0.1}
              max={3.0}
              step={0.1}
              decimals={2}
              onChange={(v) => dispatch({ type: "SET_AMPLITUDE", value: v })}
            />
          </div>

          {/* Wave number display */}
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-400">k₁ (incident)</span>
              <span className="font-mono text-foreground">
                {wn.k1.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">E = k₁²/2</span>
              <span className="font-mono text-foreground">
                {wn.E.toFixed(2)}
              </span>
            </div>
            {wn.regime === "above" && wn.k2 !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-400">k₂ (transmitted)</span>
                <span className="font-mono text-foreground">
                  {wn.k2.toFixed(2)}
                </span>
              </div>
            )}
            {wn.regime === "below" && wn.kappa2 !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400">κ₂ (evanescent)</span>
                <span className="font-mono text-foreground">
                  {wn.kappa2.toFixed(2)}
                </span>
              </div>
            )}
            {wn.regime !== "no-barrier" && (
              <div className="mt-1 rounded bg-surface-hover px-2 py-1 text-[10px]">
                {wn.regime === "above" ? (
                  <span className="text-green-400">
                    E &gt; V₀ — transmission + partial reflection
                  </span>
                ) : (
                  <span className="text-red-400">
                    E &lt; V₀ — evanescent tunnelling
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Barriers & Walls ── */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Barriers & Walls</h3>
            <button
              onClick={onAddBarrier}
              className="rounded border border-border px-2 py-0.5 text-[10px] text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              + Add Barrier
            </button>
          </div>

          {/* Barrier list */}
          {state.barriers.length === 0 && (
            <p className="mb-3 text-xs text-text-muted italic">
              No barriers. Click &quot;+ Add Barrier&quot; to create one.
            </p>
          )}
          <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">
            {state.barriers.map((b, idx) => (
              <BarrierItem
                key={b.id}
                barrier={b}
                index={idx}
                isSelected={b.id === state.selectedBarrierId}
                onSelect={() =>
                  dispatch({
                    type: "SELECT_BARRIER",
                    id:
                      b.id === state.selectedBarrierId ? null : b.id,
                  })
                }
                onRemove={() =>
                  dispatch({ type: "REMOVE_BARRIER", id: b.id })
                }
                onUpdate={(field, value) =>
                  dispatch({
                    type: "UPDATE_BARRIER",
                    id: b.id,
                    field,
                    value,
                  })
                }
              />
            ))}
          </div>

          {/* Wall config */}
          <div className="space-y-2 border-t border-border pt-3">
            <h4 className="text-xs font-semibold text-text-muted">Boundaries</h4>
            <WallSelector
              label="Left wall"
              value={state.leftWall}
              height={state.leftWallHeight}
              onChange={(w) => dispatch({ type: "SET_LEFT_WALL", wall: w })}
              onHeightChange={(v) =>
                dispatch({ type: "SET_LEFT_WALL_HEIGHT", value: v })
              }
            />
            <WallSelector
              label="Right wall"
              value={state.rightWall}
              height={state.rightWallHeight}
              onChange={(w) => dispatch({ type: "SET_RIGHT_WALL", wall: w })}
              onHeightChange={(v) =>
                dispatch({ type: "SET_RIGHT_WALL_HEIGHT", value: v })
              }
            />
          </div>
        </div>

        {/* ── Display options ── */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Display</h3>
          <div className="space-y-2">
            {(
              [
                [
                  "showProbability",
                  "|ψ|²",
                  "bg-purple-500/20 text-purple-400",
                ],
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
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeColor}`}
                >
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

/* ── Sub-components ──────────────────────────────────────────────── */

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  decimals,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-text-muted">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(decimals)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

function BarrierItem({
  barrier,
  index,
  isSelected,
  onSelect,
  onRemove,
  onUpdate,
}: {
  barrier: Barrier;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onUpdate: (field: "center" | "width" | "height", value: number) => void;
}) {
  return (
    <div
      className={`rounded border p-2 text-xs transition-colors ${
        isSelected
          ? "border-accent/50 bg-accent/5"
          : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onSelect}
          className="font-medium text-foreground hover:text-accent"
        >
          Barrier {index + 1}
          {!isSelected && (
            <span className="ml-2 text-text-muted">
              V₀={barrier.height.toFixed(0)}, x={barrier.center.toFixed(2)}
            </span>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-text-muted hover:text-red-400"
          title="Remove barrier"
        >
          ×
        </button>
      </div>

      {isSelected && (
        <div className="mt-2 space-y-2">
          <SliderRow
            label="Center"
            value={barrier.center}
            min={0.05}
            max={0.95}
            step={0.01}
            decimals={2}
            onChange={(v) => onUpdate("center", v)}
          />
          <SliderRow
            label="Width"
            value={barrier.width}
            min={0.005}
            max={0.2}
            step={0.005}
            decimals={3}
            onChange={(v) => onUpdate("width", v)}
          />
          <SliderRow
            label="Height (V₀)"
            value={barrier.height}
            min={10}
            max={1000}
            step={10}
            decimals={0}
            onChange={(v) => onUpdate("height", v)}
          />
        </div>
      )}
    </div>
  );
}

function WallSelector({
  label,
  value,
  height,
  onChange,
  onHeightChange,
}: {
  label: string;
  value: string;
  height: number;
  onChange: (w: "none" | "infinite" | "finite") => void;
  onHeightChange: (v: number) => void;
}) {
  return (
    <div className="text-xs">
      <div className="flex items-center gap-2">
        <span className="w-16 text-text-muted">{label}:</span>
        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value as "none" | "infinite" | "finite")
          }
          className="flex-1 cursor-pointer rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground"
        >
          <option value="none">Open</option>
          <option value="infinite">Infinite</option>
          <option value="finite">Finite</option>
        </select>
      </div>
      {value === "finite" && (
        <div className="mt-1 ml-18">
          <SliderRow
            label="Height"
            value={height}
            min={10}
            max={1000}
            step={10}
            decimals={0}
            onChange={onHeightChange}
          />
        </div>
      )}
    </div>
  );
}
