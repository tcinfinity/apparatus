export type LensType = "biconvex" | "biconcave" | "plano-convex" | "plano-concave";

export interface Lens {
  id: string;
  type: LensType;
  position: number;       // x position on axis (in sim units, 0 = center)
  focalLength: number;    // positive for converging, negative for diverging
  height: number;         // display height
  allowDifferentCurvature: boolean;
  thickLensMode: boolean;
  r1: number;             // radius of curvature surface 1
  r2: number;             // radius of curvature surface 2
  thickness: number;      // lens thickness (used in thick mode)
  refractiveIndex: number;
  labelColor: string;     // unique color for lens label on canvas
}

export interface LensObject {
  id: string;
  position: number;       // x position on axis
  height: number;         // height of object arrow (positive = above axis)
  color: string;
}

export interface RaySegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed: boolean;
  color: string;
}

export interface ImageInfo {
  objectId: string;
  lensIndex: number;      // which lens produced this image (0-based)
  position: number;
  height: number;
  magnification: number;
  isReal: boolean;
  isUpright: boolean;
}

export interface LensBuilderState {
  lenses: Lens[];
  objects: LensObject[];
  selectedLensId: string | null;
  selectedObjectId: string | null;
  dragTarget: { type: "lens" | "object"; id: string } | null;
}

export type LensBuilderAction =
  | { type: "ADD_LENS"; lens: Lens }
  | { type: "ADD_OBJECT"; object: LensObject }
  | { type: "UPDATE_LENS"; id: string; updates: Partial<Lens> }
  | { type: "UPDATE_OBJECT"; id: string; updates: Partial<LensObject> }
  | { type: "REMOVE_LENS"; id: string }
  | { type: "REMOVE_OBJECT"; id: string }
  | { type: "SELECT_LENS"; id: string | null }
  | { type: "SELECT_OBJECT"; id: string | null }
  | { type: "SET_DRAG"; target: LensBuilderState["dragTarget"] }
  | { type: "SET_ORIGIN"; objectId: string };
