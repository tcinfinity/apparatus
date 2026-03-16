"use client";

import { useReducer, useState, useCallback } from "react";
import SimulationNav from "@/components/layout/SimulationNav";
import RayCanvas from "@/components/lens-builder/RayCanvas";
import LensControls from "@/components/lens-builder/LensControls";
import HelpModal from "@/components/lens-builder/HelpModal";
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
};

export default function LensBuilderPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [helpOpen, setHelpOpen] = useState(false);
  const [images, setImages] = useState<ImageInfo[]>([]);

  const handleDragLens = useCallback(
    (id: string, newPosition: number) => {
      dispatch({ type: "UPDATE_LENS", id, updates: { position: newPosition } });
    },
    []
  );

  const handleDragObject = useCallback(
    (id: string, newPosition: number) => {
      dispatch({
        type: "UPDATE_OBJECT",
        id,
        updates: { position: newPosition },
      });
    },
    []
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SimulationNav title="Lens Builder" />

      {/* Help button */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed right-4 top-16 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
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
        />
        <LensControls
          lenses={state.lenses}
          objects={state.objects}
          selectedLensId={state.selectedLensId}
          selectedObjectId={state.selectedObjectId}
          images={images}
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
        />
      </main>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
