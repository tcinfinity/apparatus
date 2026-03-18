"use client";

import { useReducer, useRef, useCallback } from "react";
import SimulationNav from "@/components/layout/SimulationNav";
import DiagramCanvas from "@/components/feynman-diagram/DiagramCanvas";
import DiagramControls from "@/components/feynman-diagram/DiagramControls";
import { cn } from "@/lib/utils";
import { generateFeynmanTikZ } from "@/lib/export/feynman-tikz";
import type {
  FeynmanDiagramState,
  FeynmanAction,
  Vertex,
  Propagator,
  TextElement,
  Tool,
  LineType,
} from "@/components/feynman-diagram/types";
import { PARTICLE_CATALOG, getDefaultLabel } from "@/components/feynman-diagram/types";

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

const initialState: FeynmanDiagramState = {
  vertices: [],
  propagators: [],
  textElements: [],
  selectedVertexId: null,
  selectedPropagatorId: null,
  selectedTextId: null,
  tool: "draw",
  particleType: "fermion",
  drawingFrom: null,
  zoom: 1,
  panX: 300,
  panY: 200,
  gridSize: 30,
};

function reducer(state: FeynmanDiagramState, action: FeynmanAction): FeynmanDiagramState {
  switch (action.type) {
    case "ADD_VERTEX": {
      const v: Vertex = { id: nextId("v"), gx: action.gx, gy: action.gy, label: "" };
      return { ...state, vertices: [...state.vertices, v], selectedVertexId: v.id, selectedPropagatorId: null, selectedTextId: null };
    }
    case "REMOVE_VERTEX":
      return {
        ...state,
        vertices: state.vertices.filter(v => v.id !== action.id),
        propagators: state.propagators.filter(p => p.from !== action.id && p.to !== action.id),
        selectedVertexId: state.selectedVertexId === action.id ? null : state.selectedVertexId,
        drawingFrom: state.drawingFrom === action.id ? null : state.drawingFrom,
      };
    case "UPDATE_VERTEX":
      return { ...state, vertices: state.vertices.map(v => v.id === action.id ? { ...v, ...action.updates } : v) };
    case "MOVE_VERTEX":
      return { ...state, vertices: state.vertices.map(v => v.id === action.id ? { ...v, gx: action.gx, gy: action.gy } : v) };
    case "SELECT_VERTEX":
      return { ...state, selectedVertexId: action.id };
    case "ADD_PROPAGATOR": {
      const p: Propagator = {
        id: nextId("p"),
        from: action.from,
        to: action.to,
        lineType: state.particleType,
        label: getDefaultLabel(state.particleType),
      };
      return { ...state, propagators: [...state.propagators, p], selectedPropagatorId: p.id, selectedVertexId: null, selectedTextId: null };
    }
    case "REMOVE_PROPAGATOR":
      return { ...state, propagators: state.propagators.filter(p => p.id !== action.id), selectedPropagatorId: state.selectedPropagatorId === action.id ? null : state.selectedPropagatorId };
    case "UPDATE_PROPAGATOR":
      return { ...state, propagators: state.propagators.map(p => p.id === action.id ? { ...p, ...action.updates } : p) };
    case "SELECT_PROPAGATOR":
      return { ...state, selectedPropagatorId: action.id };
    case "ADD_TEXT": {
      const t: TextElement = { id: nextId("t"), gx: action.gx, gy: action.gy, text: "Label", isLatex: false };
      return { ...state, textElements: [...state.textElements, t], selectedTextId: t.id, selectedVertexId: null, selectedPropagatorId: null };
    }
    case "REMOVE_TEXT":
      return { ...state, textElements: state.textElements.filter(t => t.id !== action.id), selectedTextId: state.selectedTextId === action.id ? null : state.selectedTextId };
    case "UPDATE_TEXT":
      return { ...state, textElements: state.textElements.map(t => t.id === action.id ? { ...t, ...action.updates } : t) };
    case "SELECT_TEXT":
      return { ...state, selectedTextId: action.id };
    case "SET_TOOL":
      return { ...state, tool: action.tool, drawingFrom: null };
    case "SET_PARTICLE_TYPE":
      return { ...state, particleType: action.lineType };
    case "SET_DRAWING_FROM":
      return { ...state, drawingFrom: action.id };
    case "SET_ZOOM":
      return { ...state, zoom: Math.max(0.3, Math.min(3, action.zoom)) };
    case "SET_PAN":
      return { ...state, panX: action.x, panY: action.y };
    case "DESELECT_ALL":
      return { ...state, selectedVertexId: null, selectedPropagatorId: null, selectedTextId: null };
    case "CLEAR":
      return { ...initialState, panX: state.panX, panY: state.panY, zoom: state.zoom };
    default:
      return state;
  }
}

const TOOLS: { tool: Tool; label: string; icon: string }[] = [
  { tool: "draw", label: "Draw", icon: "✏️" },
  { tool: "eraser", label: "Eraser", icon: "🗑" },
  { tool: "select", label: "Select", icon: "↖" },
  { tool: "text", label: "Text", icon: "T" },
  { tool: "pan", label: "Pan", icon: "✋" },
];

export default function FeynmanDiagramPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleExport = useCallback((format: "png" | "jpeg" | "svg" | "json" | "tikz") => {
    if (format === "json") {
      const data = JSON.stringify({ vertices: state.vertices, propagators: state.propagators, textElements: state.textElements }, null, 2);
      downloadBlob(new Blob([data], { type: "application/json" }), "feynman-diagram.json");
      return;
    }
    if (format === "tikz") {
      const tikz = generateFeynmanTikZ(state.vertices, state.propagators, state.textElements);
      downloadBlob(new Blob([tikz], { type: "text/plain" }), "feynman-diagram.tex");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (format === "svg") {
      // Simple SVG export: just embed the canvas as a PNG data URL
      const dataUrl = canvas.toDataURL("image/png");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/></svg>`;
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "feynman-diagram.svg");
      return;
    }
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const url = canvas.toDataURL(mime, 0.95);
    const a = document.createElement("a");
    a.download = `feynman-diagram.${format}`;
    a.href = url;
    a.click();
  }, [state.vertices, state.propagators, state.textElements]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SimulationNav title="Feynman Diagram Editor" />

      <main className="flex flex-1 gap-0">
        {/* Left sidebar: particle types */}
        <div className="flex w-48 shrink-0 flex-col border-r border-border bg-surface p-3">
          <h3 className="mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Particles</h3>
          <div className="space-y-0.5">
            {PARTICLE_CATALOG.map(p => (
              <button
                key={p.type}
                onClick={() => dispatch({ type: "SET_PARTICLE_TYPE", lineType: p.type })}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                  state.particleType === p.type
                    ? "bg-accent-muted text-accent"
                    : "text-text-muted hover:bg-surface-hover hover:text-foreground"
                )}
              >
                <span className="w-5 text-center font-mono text-[10px]">{p.symbol}</span>
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[10px] text-text-muted">{p.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Properties panel */}
          <div className="mt-auto pt-3">
            <DiagramControls
              vertices={state.vertices}
              propagators={state.propagators}
              textElements={state.textElements}
              selectedVertexId={state.selectedVertexId}
              selectedPropagatorId={state.selectedPropagatorId}
              selectedTextId={state.selectedTextId}
              dispatch={dispatch}
            />
          </div>
        </div>

        {/* Main canvas area */}
        <div className="relative flex-1">
          {/* Top-left toolbar */}
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-surface/90 p-1 backdrop-blur-sm">
            {TOOLS.map(t => (
              <button
                key={t.tool}
                onClick={() => dispatch({ type: "SET_TOOL", tool: t.tool })}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  state.tool === t.tool
                    ? "bg-accent text-white"
                    : "text-text-muted hover:bg-surface-hover hover:text-foreground"
                )}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
            <div className="mx-1 h-5 w-px bg-border" />
            <button
              onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom + 0.2 })}
              className="cursor-pointer rounded-md px-2 py-1.5 text-xs text-text-muted hover:bg-surface-hover hover:text-foreground"
              title="Zoom in"
            >
              +
            </button>
            <span className="px-1 text-[10px] text-text-muted">{Math.round(state.zoom * 100)}%</span>
            <button
              onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom - 0.2 })}
              className="cursor-pointer rounded-md px-2 py-1.5 text-xs text-text-muted hover:bg-surface-hover hover:text-foreground"
              title="Zoom out"
            >
              −
            </button>
          </div>

          {/* Top-right export buttons */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-surface/90 p-1 backdrop-blur-sm">
            {(["png", "jpeg", "svg", "json", "tikz"] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="cursor-pointer rounded-md px-2.5 py-1.5 text-[10px] font-medium uppercase text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                {fmt === "tikz" ? "TikZ" : fmt.toUpperCase()}
              </button>
            ))}
            <div className="mx-1 h-5 w-px bg-border" />
            <button
              onClick={() => dispatch({ type: "CLEAR" })}
              className="cursor-pointer rounded-md px-2.5 py-1.5 text-[10px] font-medium text-red-400/60 transition-colors hover:text-red-500"
            >
              Clear
            </button>
          </div>

          {/* Drawing mode indicator */}
          {state.drawingFrom && (
            <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md border border-accent/30 bg-accent-muted px-3 py-1.5 text-xs text-accent">
              Click another vertex to connect, or click empty space to cancel
            </div>
          )}

          <DiagramCanvas
            vertices={state.vertices}
            propagators={state.propagators}
            textElements={state.textElements}
            selectedVertexId={state.selectedVertexId}
            selectedPropagatorId={state.selectedPropagatorId}
            selectedTextId={state.selectedTextId}
            drawingFrom={state.drawingFrom}
            tool={state.tool}
            particleType={state.particleType}
            zoom={state.zoom}
            panX={state.panX}
            panY={state.panY}
            gridSize={state.gridSize}
            dispatch={dispatch}
            onCanvasReady={(el) => { canvasRef.current = el; }}
          />
        </div>
      </main>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = filename;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}
