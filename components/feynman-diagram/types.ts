export type LineType = "fermion" | "antifermion" | "photon" | "gluon" | "w-boson" | "z-boson" | "higgs" | "ghost";

export type Tool = "draw" | "eraser" | "select" | "text" | "pan";

export interface Vertex {
  id: string;
  gx: number; // grid x
  gy: number; // grid y
  label: string;
}

export interface Propagator {
  id: string;
  from: string;
  to: string;
  lineType: LineType;
  label: string;
}

export interface TextElement {
  id: string;
  gx: number;
  gy: number;
  text: string;
  isLatex: boolean;
}

export interface FeynmanDiagramState {
  vertices: Vertex[];
  propagators: Propagator[];
  textElements: TextElement[];
  selectedVertexId: string | null;
  selectedPropagatorId: string | null;
  selectedTextId: string | null;
  tool: Tool;
  particleType: LineType;
  drawingFrom: string | null;
  zoom: number;
  panX: number;
  panY: number;
  gridSize: number;
}

export type FeynmanAction =
  | { type: "ADD_VERTEX"; gx: number; gy: number }
  | { type: "REMOVE_VERTEX"; id: string }
  | { type: "UPDATE_VERTEX"; id: string; updates: Partial<Vertex> }
  | { type: "MOVE_VERTEX"; id: string; gx: number; gy: number }
  | { type: "SELECT_VERTEX"; id: string | null }
  | { type: "ADD_PROPAGATOR"; from: string; to: string }
  | { type: "REMOVE_PROPAGATOR"; id: string }
  | { type: "UPDATE_PROPAGATOR"; id: string; updates: Partial<Propagator> }
  | { type: "SELECT_PROPAGATOR"; id: string | null }
  | { type: "ADD_TEXT"; gx: number; gy: number }
  | { type: "REMOVE_TEXT"; id: string }
  | { type: "UPDATE_TEXT"; id: string; updates: Partial<TextElement> }
  | { type: "SELECT_TEXT"; id: string | null }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "SET_PARTICLE_TYPE"; lineType: LineType }
  | { type: "SET_DRAWING_FROM"; id: string | null }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; x: number; y: number }
  | { type: "DESELECT_ALL" }
  | { type: "CLEAR" };

export const PARTICLE_CATALOG: { type: LineType; label: string; symbol: string; description: string }[] = [
  { type: "fermion", label: "Fermion", symbol: "→", description: "e⁻, μ⁻, quarks" },
  { type: "antifermion", label: "Antifermion", symbol: "←", description: "e⁺, μ⁺, antiquarks" },
  { type: "photon", label: "Photon", symbol: "γ", description: "Electromagnetic" },
  { type: "gluon", label: "Gluon", symbol: "g", description: "Strong force" },
  { type: "w-boson", label: "W Boson", symbol: "W±", description: "Weak force (charged)" },
  { type: "z-boson", label: "Z Boson", symbol: "Z⁰", description: "Weak force (neutral)" },
  { type: "higgs", label: "Higgs", symbol: "H", description: "Scalar boson" },
  { type: "ghost", label: "Ghost", symbol: "η", description: "Faddeev-Popov" },
];

export function getDefaultLabel(lineType: LineType): string {
  switch (lineType) {
    case "fermion": return "e⁻";
    case "antifermion": return "e⁺";
    case "photon": return "γ";
    case "gluon": return "g";
    case "w-boson": return "W±";
    case "z-boson": return "Z⁰";
    case "higgs": return "H";
    case "ghost": return "η";
  }
}
