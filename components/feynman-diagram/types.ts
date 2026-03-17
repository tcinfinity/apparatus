export type LineType = "fermion" | "photon" | "gluon" | "scalar" | "ghost";

export interface Vertex {
  id: string;
  x: number; // canvas fraction (0..1)
  y: number;
  label: string;
}

export interface Propagator {
  id: string;
  from: string; // vertex id
  to: string; // vertex id
  lineType: LineType;
  label: string;
  labelOffset: number; // 0..1 along the line, controls label position
}

export interface FeynmanDiagramState {
  vertices: Vertex[];
  propagators: Propagator[];
  selectedVertexId: string | null;
  selectedPropagatorId: string | null;
  nextLineType: LineType;
  drawingFrom: string | null; // vertex id when drawing a new propagator
}

export type FeynmanAction =
  | { type: "ADD_VERTEX"; x: number; y: number }
  | { type: "REMOVE_VERTEX"; id: string }
  | { type: "UPDATE_VERTEX"; id: string; updates: Partial<Vertex> }
  | { type: "SELECT_VERTEX"; id: string | null }
  | { type: "ADD_PROPAGATOR"; from: string; to: string }
  | { type: "REMOVE_PROPAGATOR"; id: string }
  | { type: "UPDATE_PROPAGATOR"; id: string; updates: Partial<Propagator> }
  | { type: "SELECT_PROPAGATOR"; id: string | null }
  | { type: "SET_NEXT_LINE_TYPE"; lineType: LineType }
  | { type: "SET_DRAWING_FROM"; id: string | null }
  | { type: "MOVE_VERTEX"; id: string; x: number; y: number }
  | { type: "CLEAR" };
