"use client";

import type { Vertex, Propagator, TextElement, LineType, Tool, FeynmanAction } from "./types";
import { PARTICLE_CATALOG, getDefaultLabel } from "./types";
import { cn } from "@/lib/utils";

interface DiagramControlsProps {
  vertices: Vertex[];
  propagators: Propagator[];
  textElements: TextElement[];
  selectedVertexId: string | null;
  selectedPropagatorId: string | null;
  selectedTextId: string | null;
  dispatch: React.Dispatch<FeynmanAction>;
}

export default function DiagramControls({
  vertices,
  propagators,
  textElements,
  selectedVertexId,
  selectedPropagatorId,
  selectedTextId,
  dispatch,
}: DiagramControlsProps) {
  const selectedVertex = vertices.find(v => v.id === selectedVertexId);
  const selectedPropagator = propagators.find(p => p.id === selectedPropagatorId);
  const selectedText = textElements.find(t => t.id === selectedTextId);

  if (!selectedVertex && !selectedPropagator && !selectedText) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {selectedVertex && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Vertex</h3>
            <button
              onClick={() => dispatch({ type: "REMOVE_VERTEX", id: selectedVertex.id })}
              className="cursor-pointer text-xs text-red-400/60 hover:text-red-500"
            >
              Delete
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <label className="mb-0.5 block text-text-muted">Label</label>
              <input
                type="text"
                value={selectedVertex.label}
                onChange={(e) => dispatch({ type: "UPDATE_VERTEX", id: selectedVertex.id, updates: { label: e.target.value } })}
                placeholder="e.g. e⁻, γ"
                className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-accent/50 focus:outline-none"
              />
            </div>
            <div className="text-text-muted">
              Grid: ({selectedVertex.gx}, {selectedVertex.gy})
            </div>
          </div>
        </div>
      )}

      {selectedPropagator && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Propagator</h3>
            <button
              onClick={() => dispatch({ type: "REMOVE_PROPAGATOR", id: selectedPropagator.id })}
              className="cursor-pointer text-xs text-red-400/60 hover:text-red-500"
            >
              Delete
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <label className="mb-0.5 block text-text-muted">Type</label>
              <select
                value={selectedPropagator.lineType}
                onChange={(e) => dispatch({
                  type: "UPDATE_PROPAGATOR",
                  id: selectedPropagator.id,
                  updates: {
                    lineType: e.target.value as LineType,
                    label: getDefaultLabel(e.target.value as LineType),
                  },
                })}
                className="w-full cursor-pointer rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
              >
                {PARTICLE_CATALOG.map(p => (
                  <option key={p.type} value={p.type}>{p.label} — {p.symbol}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-text-muted">Label</label>
              <input
                type="text"
                value={selectedPropagator.label}
                onChange={(e) => dispatch({ type: "UPDATE_PROPAGATOR", id: selectedPropagator.id, updates: { label: e.target.value } })}
                className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-accent/50 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {selectedText && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Text</h3>
            <button
              onClick={() => dispatch({ type: "REMOVE_TEXT", id: selectedText.id })}
              className="cursor-pointer text-xs text-red-400/60 hover:text-red-500"
            >
              Delete
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <label className="mb-0.5 block text-text-muted">Text</label>
              <input
                type="text"
                value={selectedText.text}
                onChange={(e) => dispatch({ type: "UPDATE_TEXT", id: selectedText.id, updates: { text: e.target.value } })}
                className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-accent/50 focus:outline-none"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-text-muted">
              <input
                type="checkbox"
                checked={selectedText.isLatex}
                onChange={(e) => dispatch({ type: "UPDATE_TEXT", id: selectedText.id, updates: { isLatex: e.target.checked } })}
                className="accent-accent"
              />
              LaTeX rendering
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
