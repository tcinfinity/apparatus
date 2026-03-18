"use client";

import { useRef, useEffect, useCallback } from "react";
import type { Vertex, Propagator, TextElement, LineType, Tool, FeynmanAction } from "./types";
import { getDefaultLabel } from "./types";

interface DiagramCanvasProps {
  vertices: Vertex[];
  propagators: Propagator[];
  textElements: TextElement[];
  selectedVertexId: string | null;
  selectedPropagatorId: string | null;
  selectedTextId: string | null;
  drawingFrom: string | null;
  tool: Tool;
  particleType: LineType;
  zoom: number;
  panX: number;
  panY: number;
  gridSize: number;
  dispatch: React.Dispatch<FeynmanAction>;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function DiagramCanvas({
  vertices,
  propagators,
  textElements,
  selectedVertexId,
  selectedPropagatorId,
  selectedTextId,
  drawingFrom,
  tool,
  particleType,
  zoom,
  panX,
  panY,
  gridSize,
  dispatch,
  onCanvasReady,
}: DiagramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string; type: "vertex" | "text" } | null>(null);
  const panDragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverRef = useRef<{ type: "vertex" | "propagator" | "text"; id: string } | null>(null);

  // Grid coord → canvas pixel
  const gridToPixel = useCallback((gx: number, gy: number) => {
    return {
      px: panX + gx * gridSize * zoom,
      py: panY + gy * gridSize * zoom,
    };
  }, [panX, panY, gridSize, zoom]);

  // Canvas pixel → nearest grid coord
  const pixelToGrid = useCallback((px: number, py: number) => {
    const gx = Math.round((px - panX) / (gridSize * zoom));
    const gy = Math.round((py - panY) / (gridSize * zoom));
    return { gx, gy };
  }, [panX, panY, gridSize, zoom]);

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

    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    const step = gridSize * zoom;

    // Grid dots
    ctx.fillStyle = "rgba(60,60,80,0.5)";
    const startGX = Math.floor(-panX / step) - 1;
    const endGX = Math.ceil((w - panX) / step) + 1;
    const startGY = Math.floor(-panY / step) - 1;
    const endGY = Math.ceil((h - panY) / step) + 1;
    for (let gx = startGX; gx <= endGX; gx++) {
      for (let gy = startGY; gy <= endGY; gy++) {
        const px = panX + gx * step;
        const py = panY + gy * step;
        if (px >= 0 && px <= w && py >= 0 && py <= h) {
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Time arrow (centered)
    const centerX = w / 2;
    ctx.strokeStyle = "rgba(136,136,160,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX, h - 15);
    ctx.lineTo(centerX, 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(centerX - 4, 22);
    ctx.lineTo(centerX, 14);
    ctx.lineTo(centerX + 4, 22);
    ctx.stroke();
    ctx.fillStyle = "rgba(136,136,160,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("time", centerX, h - 4);

    // Draw propagators
    for (const prop of propagators) {
      const fromV = vertices.find(v => v.id === prop.from);
      const toV = vertices.find(v => v.id === prop.to);
      if (!fromV || !toV) continue;

      const p1 = gridToPixel(fromV.gx, fromV.gy);
      const p2 = gridToPixel(toV.gx, toV.gy);
      const isSelected = prop.id === selectedPropagatorId;
      const isHovered = tool === "eraser" && hoverRef.current?.type === "propagator" && hoverRef.current.id === prop.id;

      drawPropagator(ctx, p1.px, p1.py, p2.px, p2.py, prop.lineType, isSelected, isHovered);

      // Label
      if (prop.label) {
        const mx = (p1.px + p2.px) / 2;
        const my = (p1.py + p2.py) / 2;
        const dx = p2.px - p1.px;
        const dy = p2.py - p1.py;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        ctx.fillStyle = isSelected ? "#a78bfa" : "rgba(200,200,220,0.8)";
        ctx.font = `${Math.max(12, 13 * zoom)}px serif`;
        ctx.textAlign = "center";
        ctx.fillText(prop.label, mx + nx * 14, my + ny * 14 + 4);
      }
    }

    // Drawing preview
    if (drawingFrom && tool === "draw") {
      const fromV = vertices.find(v => v.id === drawingFrom);
      if (fromV) {
        const p1 = gridToPixel(fromV.gx, fromV.gy);
        const snapped = pixelToGrid(mouseRef.current.x, mouseRef.current.y);
        const p2 = gridToPixel(snapped.gx, snapped.gy);
        ctx.strokeStyle = "rgba(124,58,237,0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Snap preview dot
        ctx.fillStyle = "rgba(124,58,237,0.3)";
        ctx.beginPath();
        ctx.arc(p2.px, p2.py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw vertices
    for (const v of vertices) {
      const p = gridToPixel(v.gx, v.gy);
      const isSelected = v.id === selectedVertexId;
      const isDrawSource = v.id === drawingFrom;
      const isHovered = tool === "eraser" && hoverRef.current?.type === "vertex" && hoverRef.current.id === v.id;

      ctx.beginPath();
      ctx.arc(p.px, p.py, isSelected ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isHovered
        ? "#ef4444"
        : isDrawSource
        ? "#7c3aed"
        : isSelected
        ? "#a78bfa"
        : "#e8e8ed";
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "rgba(124,58,237,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.px, p.py, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (v.label) {
        ctx.fillStyle = isSelected ? "#a78bfa" : "rgba(200,200,220,0.6)";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(v.label, p.px, p.py - 12);
      }
    }

    // Draw text elements
    for (const te of textElements) {
      const p = gridToPixel(te.gx, te.gy);
      const isSelected = te.id === selectedTextId;
      const isHovered = tool === "eraser" && hoverRef.current?.type === "text" && hoverRef.current.id === te.id;
      ctx.fillStyle = isHovered ? "#ef4444" : isSelected ? "#a78bfa" : "rgba(200,200,220,0.8)";
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.fillText(te.text, p.px, p.py + 5);
    }
  }, [vertices, propagators, textElements, selectedVertexId, selectedPropagatorId, selectedTextId, drawingFrom, tool, gridToPixel, pixelToGrid, zoom]);

  useEffect(() => {
    draw();
    if (onCanvasReady && canvasRef.current) onCanvasReady(canvasRef.current);
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw, onCanvasReady]);

  // Redraw during draw mode for preview line
  useEffect(() => {
    if (!drawingFrom) return;
    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, [drawingFrom, draw]);

  // Find element at position
  const findAt = useCallback((mx: number, my: number): { type: "vertex" | "propagator" | "text"; id: string } | null => {
    // Check vertices first
    for (const v of vertices) {
      const p = gridToPixel(v.gx, v.gy);
      if (Math.sqrt((mx - p.px) ** 2 + (my - p.py) ** 2) < 15) {
        return { type: "vertex", id: v.id };
      }
    }
    // Check text elements
    for (const te of textElements) {
      const p = gridToPixel(te.gx, te.gy);
      if (Math.abs(mx - p.px) < 30 && Math.abs(my - p.py) < 12) {
        return { type: "text", id: te.id };
      }
    }
    // Check propagators
    for (const prop of propagators) {
      const fromV = vertices.find(v => v.id === prop.from);
      const toV = vertices.find(v => v.id === prop.to);
      if (!fromV || !toV) continue;
      const p1 = gridToPixel(fromV.gx, fromV.gy);
      const p2 = gridToPixel(toV.gx, toV.gy);
      if (pointToSegmentDist(mx, my, p1.px, p1.py, p2.px, p2.py) < 10) {
        return { type: "propagator", id: prop.id };
      }
    }
    return null;
  }, [vertices, propagators, textElements, gridToPixel]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (tool === "pan") {
      panDragRef.current = { startX: mx, startY: my, startPanX: panX, startPanY: panY };
      return;
    }

    if (tool === "eraser") {
      const hit = findAt(mx, my);
      if (hit) {
        if (hit.type === "vertex") dispatch({ type: "REMOVE_VERTEX", id: hit.id });
        else if (hit.type === "propagator") dispatch({ type: "REMOVE_PROPAGATOR", id: hit.id });
        else if (hit.type === "text") dispatch({ type: "REMOVE_TEXT", id: hit.id });
      }
      return;
    }

    if (tool === "text") {
      const grid = pixelToGrid(mx, my);
      dispatch({ type: "ADD_TEXT", gx: grid.gx, gy: grid.gy });
      return;
    }

    if (tool === "draw") {
      // Check if clicking on a vertex
      for (const v of vertices) {
        const p = gridToPixel(v.gx, v.gy);
        if (Math.sqrt((mx - p.px) ** 2 + (my - p.py) ** 2) < 15) {
          if (drawingFrom) {
            if (drawingFrom !== v.id) {
              dispatch({ type: "ADD_PROPAGATOR", from: drawingFrom, to: v.id });
            }
            dispatch({ type: "SET_DRAWING_FROM", id: null });
          } else {
            dispatch({ type: "SET_DRAWING_FROM", id: v.id });
          }
          return;
        }
      }

      // Click on empty space: create vertex
      const grid = pixelToGrid(mx, my);
      dispatch({ type: "ADD_VERTEX", gx: grid.gx, gy: grid.gy });

      if (drawingFrom) {
        // Cancel drawing if clicked empty space
        dispatch({ type: "SET_DRAWING_FROM", id: null });
      }
      return;
    }

    if (tool === "select") {
      const hit = findAt(mx, my);
      if (hit) {
        dispatch({ type: "DESELECT_ALL" });
        if (hit.type === "vertex") {
          dispatch({ type: "SELECT_VERTEX", id: hit.id });
          dragRef.current = { id: hit.id, type: "vertex" };
        } else if (hit.type === "propagator") {
          dispatch({ type: "SELECT_PROPAGATOR", id: hit.id });
        } else if (hit.type === "text") {
          dispatch({ type: "SELECT_TEXT", id: hit.id });
          dragRef.current = { id: hit.id, type: "text" };
        }
      } else {
        dispatch({ type: "DESELECT_ALL" });
      }
    }
  }, [tool, vertices, drawingFrom, panX, panY, dispatch, findAt, gridToPixel, pixelToGrid]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current = { x: mx, y: my };

    if (tool === "pan" && panDragRef.current) {
      const dx = mx - panDragRef.current.startX;
      const dy = my - panDragRef.current.startY;
      dispatch({ type: "SET_PAN", x: panDragRef.current.startPanX + dx, y: panDragRef.current.startPanY + dy });
      return;
    }

    if (tool === "eraser") {
      hoverRef.current = findAt(mx, my);
      draw();
      return;
    }

    if (dragRef.current && tool === "select") {
      const grid = pixelToGrid(mx, my);
      if (dragRef.current.type === "vertex") {
        dispatch({ type: "MOVE_VERTEX", id: dragRef.current.id, gx: grid.gx, gy: grid.gy });
      } else if (dragRef.current.type === "text") {
        dispatch({ type: "UPDATE_TEXT", id: dragRef.current.id, updates: { gx: grid.gx, gy: grid.gy } });
      }
    }
  }, [tool, dispatch, findAt, pixelToGrid, draw]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    panDragRef.current = null;
  }, []);

  const cursor = tool === "pan" ? "grab" : tool === "eraser" ? "crosshair" : tool === "text" ? "text" : "crosshair";

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-border"
      style={{ height: "65vh", cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2);
}

function drawPropagator(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  lineType: LineType, selected: boolean, hovered: boolean
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const color = hovered ? "#ef4444" : selected ? "#a78bfa" : getLineColor(lineType);
  const lw = selected ? 2.5 : 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = lw;

  switch (lineType) {
    case "fermion":
    case "antifermion": {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // Arrow at midpoint
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const angle = lineType === "fermion" ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx);
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
    case "photon":
    case "z-boson": {
      drawWavyLine(ctx, x1, y1, x2, y2, 7, 6, color, lw);
      break;
    }
    case "gluon": {
      drawCurlyLine(ctx, x1, y1, x2, y2, 8, 7, color, lw);
      break;
    }
    case "w-boson": {
      drawWavyLine(ctx, x1, y1, x2, y2, 7, 6, color, lw);
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
    case "higgs": {
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "ghost": {
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
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

function drawWavyLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, amplitude: number, wavelength: number, color: string, lw: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(60, Math.round(len / 2));
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const wave = Math.sin((t * len / wavelength) * Math.PI) * amplitude;
    if (i === 0) ctx.moveTo(px + nx * wave, py + ny * wave);
    else ctx.lineTo(px + nx * wave, py + ny * wave);
  }
  ctx.stroke();
}

function drawCurlyLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, amplitude: number, loopSize: number, color: string, lw: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const nx = -dy / len;
  const ny = dx / len;
  const numLoops = Math.max(3, Math.round(len / loopSize));
  const steps = numLoops * 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const phase = t * numLoops * 2 * Math.PI;
    const curveX = Math.sin(phase) * amplitude;
    const curveY = (1 - Math.cos(phase)) * amplitude * 0.5;
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
    case "antifermion": return "#60a5fa";
    case "photon": return "#fbbf24";
    case "gluon": return "#34d399";
    case "w-boson": return "#f472b6";
    case "z-boson": return "#c084fc";
    case "higgs": return "#f87171";
    case "ghost": return "#8888a0";
  }
}
