"use client";

import { useRef, useEffect, useCallback } from "react";
import type { Vertex, Propagator, LineType, FeynmanAction } from "./types";

interface DiagramCanvasProps {
  vertices: Vertex[];
  propagators: Propagator[];
  selectedVertexId: string | null;
  selectedPropagatorId: string | null;
  drawingFrom: string | null;
  nextLineType: LineType;
  dispatch: React.Dispatch<FeynmanAction>;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function DiagramCanvas({
  vertices,
  propagators,
  selectedVertexId,
  selectedPropagatorId,
  drawingFrom,
  nextLineType,
  dispatch,
  onCanvasReady,
}: DiagramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

    // Background
    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    // Grid dots
    ctx.fillStyle = "rgba(30,30,50,0.6)";
    const gs = 30;
    for (let gx = gs; gx < w; gx += gs) {
      for (let gy = gs; gy < h; gy += gs) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Time axis arrow
    ctx.strokeStyle = "rgba(136,136,160,0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(w / 2, h - 20);
    ctx.lineTo(w / 2, 20);
    ctx.stroke();
    ctx.setLineDash([]);
    // Arrow tip
    ctx.beginPath();
    ctx.moveTo(w / 2 - 5, 28);
    ctx.lineTo(w / 2, 18);
    ctx.lineTo(w / 2 + 5, 28);
    ctx.stroke();
    ctx.fillStyle = "rgba(136,136,160,0.25)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("time", w / 2, h - 6);

    // Draw propagators
    for (const prop of propagators) {
      const fromV = vertices.find((v) => v.id === prop.from);
      const toV = vertices.find((v) => v.id === prop.to);
      if (!fromV || !toV) continue;

      const x1 = fromV.x * w;
      const y1 = fromV.y * h;
      const x2 = toV.x * w;
      const y2 = toV.y * h;
      const isSelected = prop.id === selectedPropagatorId;

      drawPropagator(ctx, x1, y1, x2, y2, prop.lineType, isSelected);

      // Label
      if (prop.label) {
        const t = prop.labelOffset;
        const mx = x1 + (x2 - x1) * t;
        const my = y1 + (y2 - y1) * t;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / (len || 1);
        const ny = dx / (len || 1);
        ctx.fillStyle = isSelected ? "#a78bfa" : "rgba(200,200,220,0.8)";
        ctx.font = "13px serif";
        ctx.textAlign = "center";
        ctx.fillText(prop.label, mx + nx * 14, my + ny * 14 + 4);
      }
    }

    // Drawing preview line
    if (drawingFrom) {
      const fromV = vertices.find((v) => v.id === drawingFrom);
      if (fromV) {
        const x1 = fromV.x * w;
        const y1 = fromV.y * h;
        ctx.strokeStyle = "rgba(124,58,237,0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw vertices
    for (const v of vertices) {
      const vx = v.x * w;
      const vy = v.y * h;
      const isSelected = v.id === selectedVertexId;
      const isDrawSource = v.id === drawingFrom;

      // Vertex dot
      ctx.beginPath();
      ctx.arc(vx, vy, isSelected ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isDrawSource
        ? "#7c3aed"
        : isSelected
        ? "#a78bfa"
        : "#e8e8ed";
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "rgba(124,58,237,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(vx, vy, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Label
      if (v.label) {
        ctx.fillStyle = isSelected ? "#a78bfa" : "rgba(200,200,220,0.7)";
        ctx.font = "12px serif";
        ctx.textAlign = "center";
        ctx.fillText(v.label, vx, vy - 12);
      }
    }
  }, [vertices, propagators, selectedVertexId, selectedPropagatorId, drawingFrom]);

  useEffect(() => {
    draw();
    if (onCanvasReady && canvasRef.current) onCanvasReady(canvasRef.current);
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw, onCanvasReady]);

  // Redraw on mouse move when drawing
  useEffect(() => {
    if (!drawingFrom) return;
    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, [drawingFrom, draw]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Check if clicking on a vertex
      for (const v of vertices) {
        const vx = v.x * w;
        const vy = v.y * h;
        if (Math.sqrt((mx - vx) ** 2 + (my - vy) ** 2) < 15) {
          if (drawingFrom) {
            // Complete the propagator
            if (drawingFrom !== v.id) {
              dispatch({ type: "ADD_PROPAGATOR", from: drawingFrom, to: v.id });
            }
            dispatch({ type: "SET_DRAWING_FROM", id: null });
            return;
          }
          dispatch({ type: "SELECT_VERTEX", id: v.id });
          dispatch({ type: "SELECT_PROPAGATOR", id: null });
          dragRef.current = {
            id: v.id,
            offsetX: mx / w - v.x,
            offsetY: my / h - v.y,
          };
          return;
        }
      }

      // Cancel drawing mode
      if (drawingFrom) {
        dispatch({ type: "SET_DRAWING_FROM", id: null });
        return;
      }

      // Check propagators (distance to line segment)
      for (const prop of propagators) {
        const fromV = vertices.find((v) => v.id === prop.from);
        const toV = vertices.find((v) => v.id === prop.to);
        if (!fromV || !toV) continue;
        const x1 = fromV.x * w,
          y1 = fromV.y * h;
        const x2 = toV.x * w,
          y2 = toV.y * h;
        if (pointToSegmentDist(mx, my, x1, y1, x2, y2) < 10) {
          dispatch({ type: "SELECT_PROPAGATOR", id: prop.id });
          dispatch({ type: "SELECT_VERTEX", id: null });
          return;
        }
      }

      // Deselect all
      dispatch({ type: "SELECT_VERTEX", id: null });
      dispatch({ type: "SELECT_PROPAGATOR", id: null });
    },
    [vertices, propagators, drawingFrom, dispatch]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      mouseRef.current = { x: mx, y: my };

      if (dragRef.current) {
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        const nx = Math.max(0.02, Math.min(0.98, mx / w - dragRef.current.offsetX + dragRef.current.offsetX));
        const ny = Math.max(0.02, Math.min(0.98, my / h - dragRef.current.offsetY + dragRef.current.offsetY));
        dispatch({
          type: "MOVE_VERTEX",
          id: dragRef.current.id,
          x: mx / w,
          y: my / h,
        });
      }
    },
    [dispatch]
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Check if double-clicking on existing vertex — don't add new
      for (const v of vertices) {
        const vx = v.x * w;
        const vy = v.y * h;
        if (Math.sqrt((mx - vx) ** 2 + (my - vy) ** 2) < 15) {
          return;
        }
      }

      dispatch({ type: "ADD_VERTEX", x: mx / w, y: my / h });
    },
    [vertices, dispatch]
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full cursor-crosshair rounded-lg border border-border"
      style={{ height: "60vh" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}

function pointToSegmentDist(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

function drawPropagator(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  lineType: LineType,
  selected: boolean
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const color = selected ? "#a78bfa" : getLineColor(lineType);

  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 2.5 : 2;

  switch (lineType) {
    case "fermion": {
      // Solid line with arrow
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // Arrowhead at midpoint
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const angle = Math.atan2(dy, dx);
      const as = 7;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(mx + as * Math.cos(angle), my + as * Math.sin(angle));
      ctx.lineTo(mx - as * Math.cos(angle - 0.5), my - as * Math.sin(angle - 0.5));
      ctx.lineTo(mx - as * Math.cos(angle + 0.5), my - as * Math.sin(angle + 0.5));
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "photon": {
      // Wavy line (sinusoidal)
      drawWavyLine(ctx, x1, y1, x2, y2, 8, 6, color, selected ? 2.5 : 2);
      break;
    }
    case "gluon": {
      // Curly/coiled line
      drawCurlyLine(ctx, x1, y1, x2, y2, 10, 8, color, selected ? 2.5 : 2);
      break;
    }
    case "scalar": {
      // Dashed line
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "ghost": {
      // Dotted line with arrow
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrow
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const angle = Math.atan2(dy, dx);
      const as = 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(mx + as * Math.cos(angle), my + as * Math.sin(angle));
      ctx.lineTo(mx - as * Math.cos(angle - 0.5), my - as * Math.sin(angle - 0.5));
      ctx.lineTo(mx - as * Math.cos(angle + 0.5), my - as * Math.sin(angle + 0.5));
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

function drawWavyLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  amplitude: number,
  wavelength: number,
  color: string,
  lineWidth: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(60, Math.round(len / 2));

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const wave = Math.sin((t * len / wavelength) * Math.PI) * amplitude;
    const wx = px + nx * wave;
    const wy = py + ny * wave;
    if (i === 0) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  ctx.stroke();
}

function drawCurlyLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  amplitude: number,
  loopSize: number,
  color: string,
  lineWidth: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  const nx = -dy / len;
  const ny = dx / len;
  const numLoops = Math.max(3, Math.round(len / loopSize));
  const steps = numLoops * 20;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const loopPhase = t * numLoops * 2 * Math.PI;
    // Curly gluon shape: combination of sin and cos for looping effect
    const curveX = Math.sin(loopPhase) * amplitude;
    const curveY = (1 - Math.cos(loopPhase)) * amplitude * 0.5;
    const wx = px + nx * curveX + (dx / len) * curveY;
    const wy = py + ny * curveX + (dy / len) * curveY;
    if (i === 0) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  ctx.stroke();
}

function getLineColor(lineType: LineType): string {
  switch (lineType) {
    case "fermion":
      return "#60a5fa";
    case "photon":
      return "#fbbf24";
    case "gluon":
      return "#34d399";
    case "scalar":
      return "#f87171";
    case "ghost":
      return "#8888a0";
  }
}
