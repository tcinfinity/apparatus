"use client";

import { useRef, useEffect, useCallback } from "react";
import type { Lens, LensObject, RaySegment, ImageInfo } from "./types";
import { traceRays, getEffectiveFocalLength } from "@/lib/physics/optics";

interface RayCanvasProps {
  lenses: Lens[];
  objects: LensObject[];
  selectedLensId: string | null;
  selectedObjectId: string | null;
  onDragLens: (id: string, newPosition: number) => void;
  onDragObject: (id: string, newPosition: number) => void;
  onSelectLens: (id: string | null) => void;
  onSelectObject: (id: string | null) => void;
  images: ImageInfo[];
  setImages: (images: ImageInfo[]) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const SIM_RANGE_X = 500;
const SIM_RANGE_Y = 250;

// Subscript digits for labels
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
function toSubscript(n: number): string {
  return String(n).split("").map(d => SUBSCRIPT_DIGITS[parseInt(d)]).join("");
}

export default function RayCanvas({
  lenses,
  objects,
  selectedLensId,
  selectedObjectId,
  onDragLens,
  onDragObject,
  onSelectLens,
  onSelectObject,
  images: _images,
  setImages,
  onCanvasReady,
}: RayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    type: "lens" | "object";
    id: string;
    offsetX: number;
  } | null>(null);

  const simToCanvas = useCallback(
    (canvas: HTMLCanvasElement, sx: number, sy: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      return {
        cx: w / 2 + (sx / SIM_RANGE_X) * (w / 2),
        cy: h / 2 - (sy / SIM_RANGE_Y) * (h / 2),
      };
    },
    []
  );

  const canvasToSim = useCallback(
    (canvas: HTMLCanvasElement, cx: number, cy: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      return {
        sx: ((cx - w / 2) / (w / 2)) * SIM_RANGE_X,
        sy: -((cy - h / 2) / (h / 2)) * SIM_RANGE_Y,
      };
    },
    []
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(30,30,50,0.5)";
    ctx.lineWidth = 0.5;
    const gridStep = 50;
    for (let gx = -SIM_RANGE_X; gx <= SIM_RANGE_X; gx += gridStep) {
      const { cx } = simToCanvas(canvas, gx, 0);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
    }
    for (let gy = -SIM_RANGE_Y; gy <= SIM_RANGE_Y; gy += gridStep) {
      const { cy } = simToCanvas(canvas, 0, gy);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();
    }

    // Optical axis
    const axisY = simToCanvas(canvas, 0, 0).cy;
    ctx.strokeStyle = "rgba(136,136,160,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(w, axisY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sort lenses for consistent numbering
    const sortedLenses = [...lenses].sort((a, b) => a.position - b.position);
    const lensNumberMap = new Map<string, number>();
    sortedLenses.forEach((l, i) => lensNumberMap.set(l.id, i + 1));

    // Trace rays and collect images
    const allRays: RaySegment[] = [];
    const allImages: ImageInfo[] = [];
    const converter = (x: number, y: number) => simToCanvas(canvas, x, y);

    for (const obj of objects) {
      const { rays, images: objImages } = traceRays(obj, lenses, SIM_RANGE_X, SIM_RANGE_Y, converter);
      allRays.push(...rays);
      allImages.push(...objImages);
    }

    // Draw rays
    for (const ray of allRays) {
      ctx.strokeStyle = ray.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(ray.dashed ? [6, 4] : []);
      ctx.beginPath();
      ctx.moveTo(ray.x1, ray.y1);
      ctx.lineTo(ray.x2, ray.y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw lenses
    for (const lens of lenses) {
      const f = getEffectiveFocalLength(lens);
      const { cx, cy } = simToCanvas(canvas, lens.position, 0);
      const lensH = (lens.height / SIM_RANGE_Y) * (h / 2);
      const isSelected = lens.id === selectedLensId;
      const lensNum = lensNumberMap.get(lens.id) ?? 1;
      const isThick = lens.thickLensMode && lens.allowDifferentCurvature;
      const halfThick = isThick ? (lens.thickness / SIM_RANGE_X) * (w / 2) / 2 : 0;

      // Vertical dotted line through lens center
      ctx.strokeStyle = "rgba(136,136,160,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw lens symbol with curvature-dependent rendering
      if (isThick) {
        drawThickLensSymbol(ctx, cx, cy, lensH, lens, halfThick, isSelected);
      } else {
        drawLensSymbol(ctx, cx, cy, lensH, lens, isSelected);
      }

      // Focal points
      const focalLeft = simToCanvas(canvas, lens.position - Math.abs(f), 0);
      const focalRight = simToCanvas(canvas, lens.position + Math.abs(f), 0);
      ctx.fillStyle = lens.labelColor + "99";
      for (const fp of [focalLeft, focalRight]) {
        ctx.beginPath();
        ctx.arc(fp.cx, fp.cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Focal point labels: F₁, F₂, etc.
      ctx.font = "11px monospace";
      ctx.fillStyle = lens.labelColor + "88";
      ctx.textAlign = "center";
      ctx.fillText(`F${toSubscript(lensNum)}`, focalLeft.cx, focalLeft.cy - 10);
      ctx.fillText(`F${toSubscript(lensNum)}'`, focalRight.cx, focalRight.cy - 10);

      // Lens label: L₁, L₂ above lens
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = lens.labelColor;
      ctx.textAlign = "center";
      ctx.fillText(`L${toSubscript(lensNum)}`, cx, cy - lensH - 16);
    }

    // Draw objects
    for (const obj of objects) {
      const base = simToCanvas(canvas, obj.position, 0);
      const tip = simToCanvas(canvas, obj.position, obj.height);
      const isSelected = obj.id === selectedObjectId;

      ctx.strokeStyle = obj.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(base.cx, base.cy);
      ctx.lineTo(tip.cx, tip.cy);
      ctx.stroke();

      // Arrowhead
      const arrowSize = 8;
      const angle = Math.atan2(tip.cy - base.cy, tip.cx - base.cx);
      ctx.fillStyle = obj.color;
      ctx.beginPath();
      ctx.moveTo(tip.cx, tip.cy);
      ctx.lineTo(tip.cx - arrowSize * Math.cos(angle - 0.4), tip.cy - arrowSize * Math.sin(angle - 0.4));
      ctx.lineTo(tip.cx - arrowSize * Math.cos(angle + 0.4), tip.cy - arrowSize * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "rgba(124,58,237,0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          Math.min(base.cx, tip.cx) - 4,
          Math.min(base.cy, tip.cy) - 4,
          Math.abs(tip.cx - base.cx) + 8,
          Math.abs(tip.cy - base.cy) + 8
        );
      }
    }

    // Draw images — all in red, labeled I₁, I₂, etc.
    const IMAGE_COLOR = "#f87171";
    for (let idx = 0; idx < allImages.length; idx++) {
      const img = allImages[idx];
      if (!isFinite(img.position) || Math.abs(img.position) > SIM_RANGE_X * 2) continue;
      const base = simToCanvas(canvas, img.position, 0);
      const tip = simToCanvas(canvas, img.position, img.height);

      ctx.strokeStyle = IMAGE_COLOR;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(img.isReal ? [] : [4, 3]);
      ctx.beginPath();
      ctx.moveTo(base.cx, base.cy);
      ctx.lineTo(tip.cx, tip.cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const arrowSize = 6;
      const angle = Math.atan2(tip.cy - base.cy, tip.cx - base.cx);
      ctx.fillStyle = IMAGE_COLOR + "cc";
      ctx.beginPath();
      ctx.moveTo(tip.cx, tip.cy);
      ctx.lineTo(tip.cx - arrowSize * Math.cos(angle - 0.4), tip.cy - arrowSize * Math.sin(angle - 0.4));
      ctx.lineTo(tip.cx - arrowSize * Math.cos(angle + 0.4), tip.cy - arrowSize * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();

      // Label: I₁, I₂, etc.
      ctx.font = "11px monospace";
      ctx.fillStyle = IMAGE_COLOR;
      ctx.textAlign = "center";
      ctx.fillText(`I${toSubscript(idx + 1)}`, tip.cx, tip.cy - 12);
    }

    setImages(allImages);
  }, [lenses, objects, selectedLensId, selectedObjectId, simToCanvas, setImages]);

  useEffect(() => {
    draw();
    if (onCanvasReady && canvasRef.current) onCanvasReady(canvasRef.current);
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw, onCanvasReady]);

  // Mouse interactions
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { sx } = canvasToSim(canvas, mx, my);

      for (const obj of objects) {
        const pos = simToCanvas(canvas, obj.position, 0);
        if (Math.abs(mx - pos.cx) < 15) {
          dragRef.current = { type: "object", id: obj.id, offsetX: sx - obj.position };
          onSelectObject(obj.id);
          onSelectLens(null);
          return;
        }
      }

      for (const lens of lenses) {
        const pos = simToCanvas(canvas, lens.position, 0);
        if (Math.abs(mx - pos.cx) < 20) {
          dragRef.current = { type: "lens", id: lens.id, offsetX: sx - lens.position };
          onSelectLens(lens.id);
          onSelectObject(null);
          return;
        }
      }

      onSelectLens(null);
      onSelectObject(null);
    },
    [lenses, objects, canvasToSim, simToCanvas, onSelectLens, onSelectObject]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const { sx } = canvasToSim(canvas, mx, 0);
      const newPos = sx - dragRef.current.offsetX;

      if (dragRef.current.type === "lens") {
        onDragLens(dragRef.current.id, newPos);
      } else {
        onDragObject(dragRef.current.id, newPos);
      }
    },
    [canvasToSim, onDragLens, onDragObject]
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full cursor-crosshair rounded-lg border border-border"
      style={{ height: "60vh" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

function computeBulge(R: number, halfHeight: number): number {
  if (!isFinite(R) || Math.abs(R) > 1e4) return 0; // flat surface
  const bulge = halfHeight * Math.min(Math.max(50 / Math.abs(R), 0.05), 0.5);
  return R > 0 ? bulge : -bulge;
}

function drawLensSymbol(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfHeight: number,
  lens: Lens,
  selected: boolean
) {
  ctx.strokeStyle = selected ? "rgba(124,58,237,0.9)" : "rgba(167,139,250,0.6)";
  ctx.lineWidth = selected ? 2.5 : 2;
  const h = halfHeight;

  if (lens.allowDifferentCurvature) {
    // Use actual R1/R2 values to determine curvature
    const bulge1 = computeBulge(lens.r1, h);
    const bulge2 = computeBulge(lens.r2, h);

    // Left surface (R1)
    if (Math.abs(bulge1) < 0.5) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.lineTo(cx, cy + h);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.quadraticCurveTo(cx + bulge1, cy, cx, cy + h);
      ctx.stroke();
    }

    // Right surface (R2) — note: negative R2 means center of curvature to the left, so bulges right
    if (Math.abs(bulge2) < 0.5) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.lineTo(cx, cy + h);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.quadraticCurveTo(cx - bulge2, cy, cx, cy + h);
      ctx.stroke();
    }
  } else {
    // Default shapes based on type
    switch (lens.type) {
      case "biconvex": {
        const bulge = h * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - h);
        ctx.quadraticCurveTo(cx + bulge, cy, cx, cy + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - h);
        ctx.quadraticCurveTo(cx - bulge, cy, cx, cy + h);
        ctx.stroke();
        break;
      }
      case "biconcave": {
        const bulge = h * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx + bulge * 0.5, cy - h);
        ctx.quadraticCurveTo(cx - bulge * 0.5, cy, cx + bulge * 0.5, cy + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - bulge * 0.5, cy - h);
        ctx.quadraticCurveTo(cx + bulge * 0.5, cy, cx - bulge * 0.5, cy + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - bulge * 0.5, cy - h);
        ctx.lineTo(cx + bulge * 0.5, cy - h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - bulge * 0.5, cy + h);
        ctx.lineTo(cx + bulge * 0.5, cy + h);
        ctx.stroke();
        break;
      }
      case "plano-convex": {
        const bulge = h * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - h);
        ctx.lineTo(cx, cy + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - h);
        ctx.quadraticCurveTo(cx + bulge, cy, cx, cy + h);
        ctx.stroke();
        break;
      }
      case "plano-concave": {
        const bulge = h * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx - bulge * 0.3, cy - h);
        ctx.lineTo(cx - bulge * 0.3, cy + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - bulge * 0.3, cy - h);
        ctx.quadraticCurveTo(cx + bulge * 0.5, cy, cx - bulge * 0.3, cy + h);
        ctx.stroke();
        break;
      }
    }
  }

  // Arrow tips
  const converging = lens.type === "biconvex" || lens.type === "plano-convex";
  const as = 5;
  if (converging) {
    ctx.beginPath();
    ctx.moveTo(cx - as, cy - h - as);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx + as, cy - h - as);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - as, cy + h + as);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx + as, cy + h + as);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - as, cy - h + as);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx + as, cy - h + as);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - as, cy + h - as);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx + as, cy + h - as);
    ctx.stroke();
  }
}

function drawThickLensSymbol(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfHeight: number,
  lens: Lens,
  halfThickPx: number,
  selected: boolean
) {
  ctx.strokeStyle = selected ? "rgba(124,58,237,0.9)" : "rgba(167,139,250,0.6)";
  ctx.lineWidth = selected ? 2.5 : 2;
  const h = halfHeight;

  // Fill lens medium
  ctx.fillStyle = "rgba(124,58,237,0.06)";
  ctx.beginPath();
  ctx.rect(cx - halfThickPx, cy - h, halfThickPx * 2, h * 2);
  ctx.fill();

  const bulge1 = computeBulge(lens.r1, h);
  const bulge2 = computeBulge(lens.r2, h);
  const leftX = cx - halfThickPx;
  const rightX = cx + halfThickPx;

  // Front surface (left)
  if (Math.abs(bulge1) < 0.5) {
    ctx.beginPath();
    ctx.moveTo(leftX, cy - h);
    ctx.lineTo(leftX, cy + h);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(leftX, cy - h);
    ctx.quadraticCurveTo(leftX + bulge1, cy, leftX, cy + h);
    ctx.stroke();
  }

  // Back surface (right)
  if (Math.abs(bulge2) < 0.5) {
    ctx.beginPath();
    ctx.moveTo(rightX, cy - h);
    ctx.lineTo(rightX, cy + h);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(rightX, cy - h);
    ctx.quadraticCurveTo(rightX - bulge2, cy, rightX, cy + h);
    ctx.stroke();
  }

  // Top and bottom edges
  ctx.beginPath();
  ctx.moveTo(leftX, cy - h);
  ctx.lineTo(rightX, cy - h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(leftX, cy + h);
  ctx.lineTo(rightX, cy + h);
  ctx.stroke();
}
