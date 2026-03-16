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
}

// Simulation coordinate system:
// x: -500..500 (units), y: -250..250
// Center of canvas = (0,0) on optical axis
const SIM_RANGE_X = 500;
const SIM_RANGE_Y = 250;

export default function RayCanvas({
  lenses,
  objects,
  selectedLensId,
  selectedObjectId,
  onDragLens,
  onDragObject,
  onSelectLens,
  onSelectObject,
  images,
  setImages,
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

  // Draw everything
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

    // Grid (subtle)
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

    // Trace rays and collect images
    const allRays: RaySegment[] = [];
    const allImages: ImageInfo[] = [];

    const converter = (x: number, y: number) => simToCanvas(canvas, x, y);

    for (const obj of objects) {
      const { rays, image } = traceRays(obj, lenses, SIM_RANGE_X, SIM_RANGE_Y, converter);
      allRays.push(...rays);
      if (image) allImages.push(image);
    }

    // Draw rays
    for (const ray of allRays) {
      ctx.strokeStyle = ray.color;
      ctx.lineWidth = 1.5;
      if (ray.dashed) {
        ctx.setLineDash([6, 4]);
      } else {
        ctx.setLineDash([]);
      }
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

      drawLensSymbol(ctx, cx, cy, lensH, lens.type, isSelected);

      // Focal points
      const focalLeft = simToCanvas(canvas, lens.position - Math.abs(f), 0);
      const focalRight = simToCanvas(canvas, lens.position + Math.abs(f), 0);
      ctx.fillStyle = "rgba(245,166,35,0.6)";
      for (const fp of [focalLeft, focalRight]) {
        ctx.beginPath();
        ctx.arc(fp.cx, fp.cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // F labels
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(245,166,35,0.5)";
      ctx.textAlign = "center";
      ctx.fillText("F", focalLeft.cx, focalLeft.cy - 8);
      ctx.fillText("F", focalRight.cx, focalRight.cy - 8);
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
      ctx.lineTo(
        tip.cx - arrowSize * Math.cos(angle - 0.4),
        tip.cy - arrowSize * Math.sin(angle - 0.4)
      );
      ctx.lineTo(
        tip.cx - arrowSize * Math.cos(angle + 0.4),
        tip.cy - arrowSize * Math.sin(angle + 0.4)
      );
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

    // Draw images
    for (const img of allImages) {
      if (!isFinite(img.position) || Math.abs(img.position) > SIM_RANGE_X * 2) continue;
      const base = simToCanvas(canvas, img.position, 0);
      const tip = simToCanvas(canvas, img.position, img.height);
      const sourceObj = objects.find((o) => o.id === img.objectId);
      const color = sourceObj?.color ?? "#888";

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(img.isReal ? [] : [4, 3]);
      ctx.beginPath();
      ctx.moveTo(base.cx, base.cy);
      ctx.lineTo(tip.cx, tip.cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead (smaller, indicating image)
      const arrowSize = 6;
      const angle = Math.atan2(tip.cy - base.cy, tip.cx - base.cx);
      ctx.fillStyle = color + "88";
      ctx.beginPath();
      ctx.moveTo(tip.cx, tip.cy);
      ctx.lineTo(
        tip.cx - arrowSize * Math.cos(angle - 0.4),
        tip.cy - arrowSize * Math.sin(angle - 0.4)
      );
      ctx.lineTo(
        tip.cx - arrowSize * Math.cos(angle + 0.4),
        tip.cy - arrowSize * Math.sin(angle + 0.4)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(136,136,160,0.7)";
      ctx.textAlign = "center";
      ctx.fillText(img.isReal ? "Real" : "Virtual", tip.cx, tip.cy - 10);
    }

    setImages(allImages);
  }, [lenses, objects, selectedLensId, selectedObjectId, simToCanvas, setImages]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  // Mouse interactions
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { sx } = canvasToSim(canvas, mx, my);

      // Check objects first (smaller targets, higher priority)
      for (const obj of objects) {
        const pos = simToCanvas(canvas, obj.position, 0);
        if (Math.abs(mx - pos.cx) < 15) {
          dragRef.current = { type: "object", id: obj.id, offsetX: sx - obj.position };
          onSelectObject(obj.id);
          onSelectLens(null);
          return;
        }
      }

      // Check lenses
      for (const lens of lenses) {
        const pos = simToCanvas(canvas, lens.position, 0);
        if (Math.abs(mx - pos.cx) < 20) {
          dragRef.current = { type: "lens", id: lens.id, offsetX: sx - lens.position };
          onSelectLens(lens.id);
          onSelectObject(null);
          return;
        }
      }

      // Click on empty space = deselect
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

function drawLensSymbol(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfHeight: number,
  type: Lens["type"],
  selected: boolean
) {
  ctx.strokeStyle = selected
    ? "rgba(124,58,237,0.9)"
    : "rgba(167,139,250,0.6)";
  ctx.lineWidth = selected ? 2.5 : 2;

  const h = halfHeight;

  switch (type) {
    case "biconvex": {
      // Two outward arcs
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
      // Two inward arcs
      const bulge = h * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx + bulge * 0.5, cy - h);
      ctx.quadraticCurveTo(cx - bulge * 0.5, cy, cx + bulge * 0.5, cy + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - bulge * 0.5, cy - h);
      ctx.quadraticCurveTo(cx + bulge * 0.5, cy, cx - bulge * 0.5, cy + h);
      ctx.stroke();
      // End caps
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
      // Left flat, right arc
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
      // Left flat, right concave
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

  // Arrow tips at lens ends (indicating converging/diverging)
  if (type === "biconvex" || type === "plano-convex") {
    // Small inward arrows at tips
    const as = 5;
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
    // Small outward arrows at tips
    const as = 5;
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
