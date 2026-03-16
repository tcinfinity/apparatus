"use client";

import { useReducer, useState, useCallback, useEffect, useRef } from "react";
import SimulationNav from "@/components/layout/SimulationNav";
import RayCanvas from "@/components/lens-builder/RayCanvas";
import LensControls from "@/components/lens-builder/LensControls";
import HelpModal from "@/components/lens-builder/HelpModal";
import ExportModal from "@/components/lens-builder/ExportModal";
import type {
  Lens,
  LensObject,
  LensBuilderState,
  LensBuilderAction,
  ImageInfo,
} from "@/components/lens-builder/types";

function reducer(
  state: LensBuilderState,
  action: LensBuilderAction
): LensBuilderState {
  switch (action.type) {
    case "ADD_LENS":
      return { ...state, lenses: [...state.lenses, action.lens] };
    case "ADD_OBJECT":
      return { ...state, objects: [...state.objects, action.object] };
    case "UPDATE_LENS":
      return {
        ...state,
        lenses: state.lenses.map((l) =>
          l.id === action.id ? { ...l, ...action.updates } : l
        ),
      };
    case "UPDATE_OBJECT":
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.id ? { ...o, ...action.updates } : o
        ),
      };
    case "REMOVE_LENS":
      return {
        ...state,
        lenses: state.lenses.filter((l) => l.id !== action.id),
        selectedLensId:
          state.selectedLensId === action.id ? null : state.selectedLensId,
      };
    case "REMOVE_OBJECT":
      return {
        ...state,
        objects: state.objects.filter((o) => o.id !== action.id),
        selectedObjectId:
          state.selectedObjectId === action.id ? null : state.selectedObjectId,
      };
    case "SELECT_LENS":
      return { ...state, selectedLensId: action.id };
    case "SELECT_OBJECT":
      return { ...state, selectedObjectId: action.id };
    case "SET_DRAG":
      return { ...state, dragTarget: action.target };
    case "SET_ORIGIN": {
      const obj = state.objects.find((o) => o.id === action.objectId);
      if (!obj) return state;
      return { ...state, positionOrigin: obj.position };
    }
    case "LOAD_STATE":
      return {
        ...state,
        lenses: action.state.lenses,
        objects: action.state.objects,
        positionOrigin: action.state.positionOrigin,
      };
    default:
      return state;
  }
}

const initialState: LensBuilderState = {
  lenses: [],
  objects: [],
  selectedLensId: null,
  selectedObjectId: null,
  dragTarget: null,
  positionOrigin: 0,
};

export default function LensBuilderPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load state from URL params on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const stateParam = params.get("state");
      if (stateParam) {
        const decoded = JSON.parse(atob(stateParam));
        if (decoded.lenses && decoded.objects) {
          dispatch({
            type: "LOAD_STATE",
            state: {
              lenses: decoded.lenses,
              objects: decoded.objects,
              positionOrigin: decoded.positionOrigin ?? 0,
            },
          });
        }
      }
    } catch {
      // ignore invalid state params
    }
  }, []);

  const handleDragLens = useCallback(
    (id: string, newPosition: number) => {
      dispatch({ type: "UPDATE_LENS", id, updates: { position: newPosition } });
    },
    []
  );

  const handleDragObject = useCallback(
    (id: string, newPosition: number) => {
      dispatch({ type: "UPDATE_OBJECT", id, updates: { position: newPosition } });
    },
    []
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SimulationNav title="Lens Builder" />

      <button
        onClick={() => setHelpOpen(true)}
        className="fixed right-4 top-16 z-40 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
        title="Help"
      >
        ?
      </button>

      <main className="flex flex-1 flex-col gap-4 p-4">
        <RayCanvas
          lenses={state.lenses}
          objects={state.objects}
          selectedLensId={state.selectedLensId}
          selectedObjectId={state.selectedObjectId}
          onDragLens={handleDragLens}
          onDragObject={handleDragObject}
          onSelectLens={(id) => dispatch({ type: "SELECT_LENS", id })}
          onSelectObject={(id) => dispatch({ type: "SELECT_OBJECT", id })}
          images={images}
          setImages={setImages}
          onCanvasReady={(el) => { canvasRef.current = el; }}
        />
        <LensControls
          lenses={state.lenses}
          objects={state.objects}
          selectedLensId={state.selectedLensId}
          selectedObjectId={state.selectedObjectId}
          images={images}
          positionOrigin={state.positionOrigin}
          onAddLens={(lens: Lens) => dispatch({ type: "ADD_LENS", lens })}
          onAddObject={(obj: LensObject) =>
            dispatch({ type: "ADD_OBJECT", object: obj })
          }
          onUpdateLens={(id: string, updates: Partial<Lens>) =>
            dispatch({ type: "UPDATE_LENS", id, updates })
          }
          onUpdateObject={(id: string, updates: Partial<LensObject>) =>
            dispatch({ type: "UPDATE_OBJECT", id, updates })
          }
          onRemoveLens={(id: string) => dispatch({ type: "REMOVE_LENS", id })}
          onRemoveObject={(id: string) =>
            dispatch({ type: "REMOVE_OBJECT", id })
          }
          onSetOrigin={(objectId: string) =>
            dispatch({ type: "SET_ORIGIN", objectId })
          }
          onExport={() => setExportOpen(true)}
        />
      </main>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        lenses={state.lenses}
        objects={state.objects}
        images={images}
        positionOrigin={state.positionOrigin}
        canvasRef={canvasRef}
      />
    </div>
  );
}
