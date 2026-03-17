"use client";

import { useReducer, useRef, useCallback } from "react";
import SimulationNav from "@/components/layout/SimulationNav";
import DiagramCanvas from "@/components/feynman-diagram/DiagramCanvas";
import DiagramControls from "@/components/feynman-diagram/DiagramControls";
import type {
  FeynmanDiagramState,
  FeynmanAction,
  Vertex,
  Propagator,
} from "@/components/feynman-diagram/types";

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

const initialState: FeynmanDiagramState = {
  vertices: [],
  propagators: [],
  selectedVertexId: null,
  selectedPropagatorId: null,
  nextLineType: "fermion",
  drawingFrom: null,
};

function reducer(
  state: FeynmanDiagramState,
  action: FeynmanAction
): FeynmanDiagramState {
  switch (action.type) {
    case "ADD_VERTEX": {
      const v: Vertex = {
        id: nextId("v"),
        x: action.x,
        y: action.y,
        label: "",
      };
      return {
        ...state,
        vertices: [...state.vertices, v],
        selectedVertexId: v.id,
        selectedPropagatorId: null,
      };
    }
    case "REMOVE_VERTEX": {
      return {
        ...state,
        vertices: state.vertices.filter((v) => v.id !== action.id),
        propagators: state.propagators.filter(
          (p) => p.from !== action.id && p.to !== action.id
        ),
        selectedVertexId:
          state.selectedVertexId === action.id ? null : state.selectedVertexId,
        drawingFrom:
          state.drawingFrom === action.id ? null : state.drawingFrom,
      };
    }
    case "UPDATE_VERTEX":
      return {
        ...state,
        vertices: state.vertices.map((v) =>
          v.id === action.id ? { ...v, ...action.updates } : v
        ),
      };
    case "MOVE_VERTEX":
      return {
        ...state,
        vertices: state.vertices.map((v) =>
          v.id === action.id ? { ...v, x: action.x, y: action.y } : v
        ),
      };
    case "SELECT_VERTEX":
      return { ...state, selectedVertexId: action.id };
    case "ADD_PROPAGATOR": {
      const p: Propagator = {
        id: nextId("p"),
        from: action.from,
        to: action.to,
        lineType: state.nextLineType,
        label: "",
        labelOffset: 0.5,
      };
      return {
        ...state,
        propagators: [...state.propagators, p],
        selectedPropagatorId: p.id,
        selectedVertexId: null,
      };
    }
    case "REMOVE_PROPAGATOR":
      return {
        ...state,
        propagators: state.propagators.filter((p) => p.id !== action.id),
        selectedPropagatorId:
          state.selectedPropagatorId === action.id
            ? null
            : state.selectedPropagatorId,
      };
    case "UPDATE_PROPAGATOR":
      return {
        ...state,
        propagators: state.propagators.map((p) =>
          p.id === action.id ? { ...p, ...action.updates } : p
        ),
      };
    case "SELECT_PROPAGATOR":
      return { ...state, selectedPropagatorId: action.id };
    case "SET_NEXT_LINE_TYPE":
      return { ...state, nextLineType: action.lineType };
    case "SET_DRAWING_FROM":
      return { ...state, drawingFrom: action.id };
    case "CLEAR":
      return { ...initialState };
    default:
      return state;
  }
}

export default function FeynmanDiagramPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleExportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = "feynman-diagram.png";
    a.href = url;
    a.click();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SimulationNav title="Feynman Diagram Editor" />

      <main className="flex flex-1 flex-col gap-4 p-4">
        <DiagramCanvas
          vertices={state.vertices}
          propagators={state.propagators}
          selectedVertexId={state.selectedVertexId}
          selectedPropagatorId={state.selectedPropagatorId}
          drawingFrom={state.drawingFrom}
          nextLineType={state.nextLineType}
          dispatch={dispatch}
          onCanvasReady={(el) => {
            canvasRef.current = el;
          }}
        />
        <DiagramControls
          vertices={state.vertices}
          propagators={state.propagators}
          selectedVertexId={state.selectedVertexId}
          selectedPropagatorId={state.selectedPropagatorId}
          nextLineType={state.nextLineType}
          drawingFrom={state.drawingFrom}
          dispatch={dispatch}
          onExportPng={handleExportPng}
        />
      </main>
    </div>
  );
}
