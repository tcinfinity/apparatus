"use client";

import { useCallback } from "react";
import Button from "@/components/ui/Button";
import type { Lens, LensObject, LensType, ImageInfo } from "./types";
import { getDefaultFocalLength, getDefaultRadii, getEffectiveFocalLength } from "@/lib/physics/optics";
import { cn } from "@/lib/utils";

interface LensControlsProps {
  lenses: Lens[];
  objects: LensObject[];
  selectedLensId: string | null;
  selectedObjectId: string | null;
  images: ImageInfo[];
  positionOrigin: number;
  onAddLens: (lens: Lens) => void;
  onAddObject: (obj: LensObject) => void;
  onUpdateLens: (id: string, updates: Partial<Lens>) => void;
  onUpdateObject: (id: string, updates: Partial<LensObject>) => void;
  onRemoveLens: (id: string) => void;
  onRemoveObject: (id: string) => void;
  onSetOrigin: (objectId: string) => void;
  onExport: () => void;
}

const OBJECT_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#fb923c"];
const LABEL_COLORS = ["#f97316", "#06b6d4", "#22c55e", "#eab308", "#ec4899", "#14b8a6"];
let colorIndex = 0;
let labelColorIndex = 0;

function nextColor(): string {
  return OBJECT_COLORS[colorIndex++ % OBJECT_COLORS.length];
}

function nextLabelColor(): string {
  return LABEL_COLORS[labelColorIndex++ % LABEL_COLORS.length];
}

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

const LENS_TYPES: { type: LensType; label: string }[] = [
  { type: "biconvex", label: "Biconvex" },
  { type: "biconcave", label: "Biconcave" },
  { type: "plano-convex", label: "Plano-convex" },
  { type: "plano-concave", label: "Plano-concave" },
];

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
function toSubscript(n: number): string {
  return String(n).split("").map(d => SUBSCRIPT_DIGITS[parseInt(d)]).join("");
}

export default function LensControls({
  lenses,
  objects,
  selectedLensId,
  selectedObjectId,
  images,
  positionOrigin,
  onAddLens,
  onAddObject,
  onUpdateLens,
  onUpdateObject,
  onRemoveLens,
  onRemoveObject,
  onSetOrigin,
  onExport,
}: LensControlsProps) {
  const handleAddLens = useCallback(
    (type: LensType) => {
      const f = getDefaultFocalLength(type);
      const radii = getDefaultRadii(type, f);
      const lens: Lens = {
        id: nextId("lens"),
        type,
        position: lenses.length * 60 - 30,
        focalLength: f,
        height: 120,
        allowDifferentCurvature: false,
        thickLensMode: false,
        r1: radii.r1,
        r2: radii.r2,
        thickness: Math.abs(f) / 10,
        refractiveIndex: 1.5,
        labelColor: nextLabelColor(),
      };
      onAddLens(lens);
    },
    [lenses, onAddLens]
  );

  const handleAddObject = useCallback(() => {
    const obj: LensObject = {
      id: nextId("obj"),
      position: -200 - objects.length * 40,
      height: 80,
      color: nextColor(),
    };
    onAddObject(obj);
  }, [objects, onAddObject]);

  const selectedLens = lenses.find((l) => l.id === selectedLensId);
  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  const sortedLenses = [...lenses].sort((a, b) => a.position - b.position);
  const lensNumMap = new Map<string, number>();
  sortedLenses.forEach((l, i) => lensNumMap.set(l.id, i + 1));

  // Display position relative to origin
  const dp = (pos: number) => Math.round(pos - positionOrigin);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleAddObject} variant="secondary" size="sm">
          + Add Object
        </Button>
        <div className="h-6 w-px bg-border" />
        <span className="text-xs text-text-muted">Add Lens:</span>
        {LENS_TYPES.map((lt) => (
          <Button
            key={lt.type}
            onClick={() => handleAddLens(lt.type)}
            variant="secondary"
            size="sm"
          >
            {lt.label}
          </Button>
        ))}
        <div className="h-6 w-px bg-border" />
        <Button onClick={onExport} variant="secondary" size="sm">
          Export
        </Button>
      </div>

      {/* Selected lens details */}
      {selectedLens && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              <span style={{ color: selectedLens.labelColor }}>
                L{toSubscript(lensNumMap.get(selectedLens.id) ?? 1)}
              </span>
              {" "}
              {selectedLens.type.replace("-", " ")} Lens
            </h3>
            <button
              onClick={() => onRemoveLens(selectedLens.id)}
              className="cursor-pointer text-xs text-red-400/60 hover:text-red-500"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <EditableValue
              label="Position"
              value={dp(selectedLens.position)}
              onChange={(v) => onUpdateLens(selectedLens.id, { position: v + positionOrigin })}
            />
            <LabeledValue
              label="f (focal length)"
              value={`${getEffectiveFocalLength(selectedLens).toFixed(1)}`}
            />

            {!selectedLens.allowDifferentCurvature && (
              <div className="col-span-2">
                <label className="mb-1 block text-text-muted">
                  Focal Length: {selectedLens.focalLength.toFixed(0)}
                </label>
                <input
                  type="range"
                  min="-300"
                  max="300"
                  step="5"
                  value={selectedLens.focalLength}
                  onChange={(e) =>
                    onUpdateLens(selectedLens.id, { focalLength: Number(e.target.value) })
                  }
                  className="w-full accent-accent"
                />
              </div>
            )}

            <label className="col-span-2 flex cursor-pointer items-center gap-2 text-text-muted">
              <input
                type="checkbox"
                checked={selectedLens.allowDifferentCurvature}
                onChange={(e) =>
                  onUpdateLens(selectedLens.id, { allowDifferentCurvature: e.target.checked })
                }
                className="accent-accent"
              />
              Allow different curvature (R1, R2)
            </label>

            {selectedLens.allowDifferentCurvature && (
              <>
                <div>
                  <label className="mb-1 block text-text-muted">
                    R1: {isFinite(selectedLens.r1) ? selectedLens.r1.toFixed(0) : "∞"}
                  </label>
                  <input
                    type="range"
                    min="-500"
                    max="500"
                    step="5"
                    value={isFinite(selectedLens.r1) ? selectedLens.r1 : 500}
                    onChange={(e) =>
                      onUpdateLens(selectedLens.id, { r1: Number(e.target.value) })
                    }
                    className="w-full accent-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-text-muted">
                    R2: {isFinite(selectedLens.r2) ? selectedLens.r2.toFixed(0) : "∞"}
                  </label>
                  <input
                    type="range"
                    min="-500"
                    max="500"
                    step="5"
                    value={isFinite(selectedLens.r2) ? selectedLens.r2 : -500}
                    onChange={(e) =>
                      onUpdateLens(selectedLens.id, { r2: Number(e.target.value) })
                    }
                    className="w-full accent-accent"
                  />
                </div>

                <label className="col-span-2 flex cursor-pointer items-center gap-2 text-text-muted">
                  <input
                    type="checkbox"
                    checked={selectedLens.thickLensMode}
                    onChange={(e) =>
                      onUpdateLens(selectedLens.id, { thickLensMode: e.target.checked })
                    }
                    className="accent-accent"
                  />
                  Thick lens mode
                </label>

                {selectedLens.thickLensMode && (
                  <>
                    <div>
                      <label className="mb-1 block text-text-muted">
                        Thickness: {selectedLens.thickness.toFixed(0)}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={selectedLens.thickness}
                        onChange={(e) =>
                          onUpdateLens(selectedLens.id, { thickness: Number(e.target.value) })
                        }
                        className="w-full accent-accent"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-text-muted">
                        n: {selectedLens.refractiveIndex.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="1.0"
                        max="2.5"
                        step="0.01"
                        value={selectedLens.refractiveIndex}
                        onChange={(e) =>
                          onUpdateLens(selectedLens.id, { refractiveIndex: Number(e.target.value) })
                        }
                        className="w-full accent-accent"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* u and v distances for objects through this lens */}
          {objects.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <h4 className="mb-2 text-xs font-semibold text-text-muted">
                Object &amp; Image Distances
              </h4>
              <div className="space-y-1.5">
                {objects.map((obj) => {
                  const lensIdx = sortedLenses.findIndex(l => l.id === selectedLens.id);
                  const img = images.find(
                    (im) => im.objectId === obj.id && im.lensIndex === lensIdx
                  );
                  const u = obj.position - selectedLens.position;
                  const v = img ? img.position - selectedLens.position : null;
                  return (
                    <div key={obj.id} className="flex items-center gap-3 text-xs">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: obj.color }}
                      />
                      <span className="text-text-muted">
                        u = {u.toFixed(1)}
                      </span>
                      {v !== null && (
                        <span className="text-text-muted">
                          v = {v.toFixed(1)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected object details */}
      {selectedObject && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Object
              <span
                className="ml-2 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedObject.color }}
              />
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSetOrigin(selectedObject.id)}
                className="cursor-pointer text-xs text-accent hover:text-accent-hover"
              >
                Set as Origin
              </button>
              <button
                onClick={() => onRemoveObject(selectedObject.id)}
                className="cursor-pointer text-xs text-red-400/60 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <EditableValue
              label="Position"
              value={dp(selectedObject.position)}
              onChange={(v) => onUpdateObject(selectedObject.id, { position: v + positionOrigin })}
            />
            <EditableValue
              label="Height"
              value={selectedObject.height}
              onChange={(v) => onUpdateObject(selectedObject.id, { height: v })}
            />
            <div className="col-span-2">
              <label className="mb-1 block text-text-muted">
                Height: {selectedObject.height.toFixed(0)}
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={selectedObject.height}
                onChange={(e) =>
                  onUpdateObject(selectedObject.id, { height: Number(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image info */}
      {images.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold">Image Properties</h3>
          <div className="space-y-2">
            {images.map((img, idx) => {
              const srcObj = objects.find((o) => o.id === img.objectId);
              if (!srcObj || !isFinite(img.position)) return null;
              return (
                <div
                  key={`${img.objectId}-${img.lensIndex}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-1.5 text-xs",
                    img.objectId === selectedObjectId
                      ? "bg-accent-muted"
                      : "bg-surface-hover"
                  )}
                >
                  <span className="font-mono font-semibold text-red-400">
                    I{toSubscript(idx + 1)}
                  </span>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: srcObj.color }}
                  />
                  <span className="text-text-muted">
                    position = {dp(img.position).toFixed(1)}
                  </span>
                  <span className="text-text-muted">
                    m = {img.magnification.toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      img.isReal
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-amber-500/15 text-amber-400"
                    )}
                  >
                    {img.isReal ? "Real" : "Virtual"},{" "}
                    {img.isUpright ? "Upright" : "Inverted"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-text-muted">{label}</span>
      <span className="ml-1 font-mono text-foreground">{value}</span>
    </div>
  );
}

function EditableValue({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <span className="text-text-muted">{label}</span>
      <div className="mt-0.5 inline-flex items-stretch rounded border border-border bg-background">
        <button
          onClick={() => onChange(Math.round(value) - step)}
          className="cursor-pointer px-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={Math.round(value)}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v)) onChange(v);
          }}
          className="w-14 border-x border-border bg-transparent px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          onClick={() => onChange(Math.round(value) + step)}
          className="cursor-pointer px-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          +
        </button>
      </div>
    </div>
  );
}
