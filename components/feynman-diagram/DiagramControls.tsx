"use client";

import Button from "@/components/ui/Button";
import type { Vertex, Propagator, LineType, FeynmanAction } from "./types";
import { cn } from "@/lib/utils";

interface DiagramControlsProps {
  vertices: Vertex[];
  propagators: Propagator[];
  selectedVertexId: string | null;
  selectedPropagatorId: string | null;
  nextLineType: LineType;
  drawingFrom: string | null;
  dispatch: React.Dispatch<FeynmanAction>;
  onExportPng: () => void;
}

const LINE_TYPES: { type: LineType; label: string; description: string; color: string }[] = [
  { type: "fermion", label: "Fermion", description: "e⁻, μ, quarks", color: "bg-blue-500/20 text-blue-400" },
  { type: "photon", label: "Photon", description: "γ (wavy)", color: "bg-yellow-500/20 text-yellow-400" },
  { type: "gluon", label: "Gluon", description: "g (curly)", color: "bg-green-500/20 text-green-400" },
  { type: "scalar", label: "Scalar", description: "H (dashed)", color: "bg-red-500/20 text-red-400" },
  { type: "ghost", label: "Ghost", description: "Faddeev–Popov", color: "bg-gray-500/20 text-gray-400" },
];

export default function DiagramControls({
  vertices,
  propagators,
  selectedVertexId,
  selectedPropagatorId,
  nextLineType,
  drawingFrom,
  dispatch,
  onExportPng,
}: DiagramControlsProps) {
  const selectedVertex = vertices.find((v) => v.id === selectedVertexId);
  const selectedPropagator = propagators.find((p) => p.id === selectedPropagatorId);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Double-click to add vertex</span>
        <div className="h-6 w-px bg-border" />
        <span className="text-xs text-text-muted">Line type:</span>
        {LINE_TYPES.map((lt) => (
          <button
            key={lt.type}
            onClick={() => dispatch({ type: "SET_NEXT_LINE_TYPE", lineType: lt.type })}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              lt.color,
              nextLineType === lt.type && "ring-1 ring-accent"
            )}
            title={lt.description}
          >
            {lt.label}
          </button>
        ))}
        <div className="h-6 w-px bg-border" />
        <Button onClick={onExportPng} variant="secondary" size="sm">
          Export PNG
        </Button>
        <Button
          onClick={() => dispatch({ type: "CLEAR" })}
          variant="secondary"
          size="sm"
        >
          Clear All
        </Button>
      </div>

      {/* Drawing mode indicator */}
      {drawingFrom && (
        <div className="rounded-md border border-accent/30 bg-accent-muted px-3 py-2 text-xs text-accent">
          Click another vertex to connect, or click canvas to cancel.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Selected vertex */}
        {selectedVertex && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Vertex</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => dispatch({ type: "SET_DRAWING_FROM", id: selectedVertex.id })}
                  className="cursor-pointer text-xs text-accent hover:text-accent-hover"
                >
                  Draw Line From
                </button>
                <button
                  onClick={() => dispatch({ type: "REMOVE_VERTEX", id: selectedVertex.id })}
                  className="cursor-pointer text-xs text-red-400/60 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="mb-0.5 block text-text-muted">Label</label>
                <input
                  type="text"
                  value={selectedVertex.label}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_VERTEX",
                      id: selectedVertex.id,
                      updates: { label: e.target.value },
                    })
                  }
                  placeholder="e.g. e⁻, γ, q"
                  className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-accent/50 focus:outline-none"
                />
              </div>
              <div className="text-text-muted">
                Position: ({(selectedVertex.x * 100).toFixed(0)}%,{" "}
                {(selectedVertex.y * 100).toFixed(0)}%)
              </div>
            </div>
          </div>
        )}

        {/* Selected propagator */}
        {selectedPropagator && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Propagator</h3>
              <button
                onClick={() =>
                  dispatch({ type: "REMOVE_PROPAGATOR", id: selectedPropagator.id })
                }
                className="cursor-pointer text-xs text-red-400/60 hover:text-red-500"
              >
                Remove
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="mb-0.5 block text-text-muted">Type</label>
                <select
                  value={selectedPropagator.lineType}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_PROPAGATOR",
                      id: selectedPropagator.id,
                      updates: { lineType: e.target.value as LineType },
                    })
                  }
                  className="w-full cursor-pointer rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
                >
                  {LINE_TYPES.map((lt) => (
                    <option key={lt.type} value={lt.type}>
                      {lt.label} — {lt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-text-muted">Label</label>
                <input
                  type="text"
                  value={selectedPropagator.label}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_PROPAGATOR",
                      id: selectedPropagator.id,
                      updates: { label: e.target.value },
                    })
                  }
                  placeholder="e.g. γ, g, W±"
                  className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-accent/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick reference */}
        {!selectedVertex && !selectedPropagator && (
          <div className="col-span-full rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-2 text-sm font-semibold">Quick Reference</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-text-muted sm:grid-cols-3">
              <div><span className="text-blue-400">━━▸━━</span> Fermion (solid + arrow)</div>
              <div><span className="text-yellow-400">〰〰〰</span> Photon (wavy)</div>
              <div><span className="text-green-400">∿∿∿∿</span> Gluon (curly)</div>
              <div><span className="text-red-400">╌╌╌╌╌</span> Scalar (dashed)</div>
              <div><span className="text-gray-400">⋯⋯▸⋯⋯</span> Ghost (dotted + arrow)</div>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Double-click canvas to add vertices. Select a vertex and click &ldquo;Draw Line From&rdquo;
              to connect vertices with propagators.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
