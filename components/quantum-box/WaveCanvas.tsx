"use client";

import { useRef, useEffect, useCallback } from "react";
import type { QuantumState } from "@/lib/physics/quantum";
import {
  probabilityDensity,
  evolve,
  VIS_LEFT,
  L_VIS,
  L_COMP,
} from "@/lib/physics/quantum";
import type { Barrier, WaveMode, WallType } from "./types";

interface WaveCanvasProps {
  quantumState: QuantumState | null;
  running: boolean;
  speed: number;
  showReal: boolean;
  showImag: boolean;
  showProbability: boolean;
  showPotential: boolean;
  onTick: () => void;
  // View
  viewCenter: number;
  viewScale: number;
  onViewChange: (center: number, scale: number) => void;
  // Indicators
  x0: number;
  sigma: number;
  mode: WaveMode;
  barriers: Barrier[];
  selectedBarrierId: string | null;
  leftWall: WallType;
  rightWall: WallType;
  leftWallPos: number;
  rightWallPos: number;
}

export default function WaveCanvas({
  quantumState,
  running,
  speed,
  showReal,
  showImag,
  showProbability,
  showPotential,
  onTick,
  viewCenter,
  viewScale,
  onViewChange,
  x0,
  sigma,
  mode,
  barriers,
  selectedBarrierId,
  leftWall,
  rightWall,
  leftWallPos,
  rightWallPos,
}: WaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef(quantumState);
  stateRef.current = quantumState;

  // Refs for all props to avoid re-render issues
  const runningRef = useRef(running);
  runningRef.current = running;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const showRealRef = useRef(showReal);
  showRealRef.current = showReal;
  const showImagRef = useRef(showImag);
  showImagRef.current = showImag;
  const showProbRef = useRef(showProbability);
  showProbRef.current = showProbability;
  const showPotRef = useRef(showPotential);
  showPotRef.current = showPotential;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const viewCenterRef = useRef(viewCenter);
  viewCenterRef.current = viewCenter;
  const viewScaleRef = useRef(viewScale);
  viewScaleRef.current = viewScale;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const x0Ref = useRef(x0);
  x0Ref.current = x0;
  const sigmaRef = useRef(sigma);
  sigmaRef.current = sigma;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const barriersRef = useRef(barriers);
  barriersRef.current = barriers;
  const selectedBarrierIdRef = useRef(selectedBarrierId);
  selectedBarrierIdRef.current = selectedBarrierId;
  const leftWallRef = useRef(leftWall);
  leftWallRef.current = leftWall;
  const rightWallRef = useRef(rightWall);
  rightWallRef.current = rightWall;
  const leftWallPosRef = useRef(leftWallPos);
  leftWallPosRef.current = leftWallPos;
  const rightWallPosRef = useRef(rightWallPos);
  rightWallPosRef.current = rightWallPos;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;

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

    const { N, psiRe, psiIm, potential } = state;
    const dx = L_COMP / N;
    const margin = 40;
    const plotW = w - margin * 2;
    const plotH = h - margin * 2;
    const centerY = margin + plotH * 0.55;

    // View bounds (user coords [0, 1])
    const vc = viewCenterRef.current;
    const vs = viewScaleRef.current;
    const halfWidth = 0.5 / vs;
    const viewLeft = vc - halfWidth;
    const viewRight = vc + halfWidth;

    // User coord → screen pixel
    const userToScreen = (ux: number) =>
      margin + ((ux - viewLeft) / (viewRight - viewLeft)) * plotW;

    // Grid index → user coord
    const idxToUser = (i: number) => (i * dx - VIS_LEFT) / L_VIS;

    // Grid index range visible on screen
    const absLeft = VIS_LEFT + viewLeft * L_VIS;
    const absRight = VIS_LEFT + viewRight * L_VIS;
    const iStart = Math.max(0, Math.floor(absLeft / dx) - 1);
    const iEnd = Math.min(N - 1, Math.ceil(absRight / dx) + 1);

    // Grid lines
    ctx.strokeStyle = "rgba(30,30,50,0.5)";
    ctx.lineWidth = 0.5;
    for (let gy = 0; gy <= 4; gy++) {
      const y = margin + (plotH * gy) / 4;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + plotW, y);
      ctx.stroke();
    }

    // X-axis
    ctx.strokeStyle = "rgba(136,136,160,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, centerY);
    ctx.lineTo(margin + plotW, centerY);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "rgba(136,136,160,0.5)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    // Draw tick marks at nice intervals
    const viewWidth = viewRight - viewLeft;
    const tickStep =
      viewWidth > 0.8
        ? 0.1
        : viewWidth > 0.4
          ? 0.05
          : viewWidth > 0.15
            ? 0.02
            : 0.01;
    for (
      let t = Math.ceil(viewLeft / tickStep) * tickStep;
      t <= viewRight;
      t += tickStep
    ) {
      const sx = userToScreen(t);
      if (sx > margin + 10 && sx < margin + plotW - 10) {
        ctx.fillText(t.toFixed(2), sx, h - 12);
        ctx.beginPath();
        ctx.moveTo(sx, centerY - 3);
        ctx.lineTo(sx, centerY + 3);
        ctx.stroke();
      }
    }
    ctx.fillText("x/L", margin + plotW / 2, h - 2);

    // Scale: auto-scale to max amplitude in visible range
    const pd = probabilityDensity(state);
    let maxAmp = 0;
    for (let i = iStart; i <= iEnd; i++) {
      maxAmp = Math.max(
        maxAmp,
        Math.abs(psiRe[i]),
        Math.abs(psiIm[i]),
        Math.sqrt(pd[i])
      );
    }
    const waveScale = maxAmp > 1e-10 ? (plotH * 0.35) / maxAmp : 1;

    // ─── Potential (barriers) ───
    if (showPotRef.current) {
      let maxV = 0;
      for (let i = iStart; i <= iEnd; i++) {
        if (isFinite(potential[i]) && potential[i] < 1e8) {
          maxV = Math.max(maxV, potential[i]);
        }
      }
      if (maxV > 0) {
        const vScale = (plotH * 0.35) / maxV;

        // Fill
        ctx.fillStyle = "rgba(136,136,160,0.12)";
        ctx.beginPath();
        ctx.moveTo(userToScreen(idxToUser(iStart)), centerY);
        for (let i = iStart; i <= iEnd; i++) {
          const sx = userToScreen(idxToUser(i));
          const v = Math.min(potential[i], maxV);
          ctx.lineTo(sx, centerY - v * vScale);
        }
        ctx.lineTo(userToScreen(idxToUser(iEnd)), centerY);
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = "rgba(136,136,160,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = iStart; i <= iEnd; i++) {
          const sx = userToScreen(idxToUser(i));
          const v = Math.min(potential[i], maxV);
          if (v > 0.01 * maxV) {
            if (!started) {
              ctx.moveTo(sx, centerY - v * vScale);
              started = true;
            } else {
              ctx.lineTo(sx, centerY - v * vScale);
            }
          } else if (started) {
            ctx.stroke();
            ctx.beginPath();
            started = false;
          }
        }
        if (started) ctx.stroke();

        // V₀ labels for each barrier
        for (const b of barriersRef.current) {
          const sx = userToScreen(b.center);
          if (sx > margin && sx < margin + plotW) {
            const isSelected = b.id === selectedBarrierIdRef.current;
            ctx.fillStyle = isSelected
              ? "rgba(96,165,250,0.8)"
              : "rgba(136,136,160,0.6)";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(
              `V₀=${b.height.toFixed(0)}`,
              sx,
              centerY - Math.min(b.height, maxV) * vScale - 6
            );
          }
        }

        // Highlight selected barrier
        const selId = selectedBarrierIdRef.current;
        if (selId) {
          const selB = barriersRef.current.find((b) => b.id === selId);
          if (selB) {
            const left = userToScreen(selB.center - selB.width / 2);
            const right = userToScreen(selB.center + selB.width / 2);
            ctx.fillStyle = "rgba(96,165,250,0.08)";
            ctx.fillRect(left, margin, right - left, plotH);
            ctx.strokeStyle = "rgba(96,165,250,0.4)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(left, margin, right - left, plotH);
            ctx.setLineDash([]);
          }
        }
      }
    }

    // ─── Walls ───
    const drawWallHatch = (screenX: number, side: "left" | "right") => {
      const wallW = 12;
      const x0w = side === "left" ? screenX - wallW : screenX;
      ctx.fillStyle = "rgba(136,136,160,0.15)";
      ctx.fillRect(x0w, margin, wallW, plotH);
      ctx.strokeStyle = "rgba(136,136,160,0.5)";
      ctx.lineWidth = 1;
      for (let y = margin; y < margin + plotH; y += 8) {
        ctx.beginPath();
        if (side === "left") {
          ctx.moveTo(x0w, y);
          ctx.lineTo(x0w + wallW, y + 8);
        } else {
          ctx.moveTo(x0w + wallW, y);
          ctx.lineTo(x0w, y + 8);
        }
        ctx.stroke();
      }
      // Bold wall line
      ctx.strokeStyle = "rgba(136,136,160,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, margin);
      ctx.lineTo(screenX, margin + plotH);
      ctx.stroke();
    };

    if (leftWallRef.current === "infinite") {
      const sx = userToScreen(leftWallPosRef.current);
      if (sx > margin - 20 && sx < margin + plotW + 20) {
        drawWallHatch(sx, "left");
      }
    }
    if (rightWallRef.current === "infinite") {
      const sx = userToScreen(rightWallPosRef.current);
      if (sx > margin - 20 && sx < margin + plotW + 20) {
        drawWallHatch(sx, "right");
      }
    }

    // ─── Probability density |ψ|² ───
    if (showProbRef.current) {
      ctx.fillStyle = "rgba(124,58,237,0.12)";
      ctx.beginPath();
      ctx.moveTo(userToScreen(idxToUser(iStart)), centerY);
      for (let i = iStart; i <= iEnd; i++) {
        const sx = userToScreen(idxToUser(i));
        ctx.lineTo(sx, centerY - Math.sqrt(pd[i]) * waveScale);
      }
      ctx.lineTo(userToScreen(idxToUser(iEnd)), centerY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(167,139,250,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = iStart; i <= iEnd; i++) {
        const sx = userToScreen(idxToUser(i));
        const y = centerY - Math.sqrt(pd[i]) * waveScale;
        if (i === iStart) ctx.moveTo(sx, y);
        else ctx.lineTo(sx, y);
      }
      ctx.stroke();
    }

    // ─── Re(ψ) ───
    if (showRealRef.current) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = iStart; i <= iEnd; i++) {
        const sx = userToScreen(idxToUser(i));
        const y = centerY - psiRe[i] * waveScale;
        if (i === iStart) ctx.moveTo(sx, y);
        else ctx.lineTo(sx, y);
      }
      ctx.stroke();
    }

    // ─── Im(ψ) ───
    if (showImagRef.current) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = iStart; i <= iEnd; i++) {
        const sx = userToScreen(idxToUser(i));
        const y = centerY - psiIm[i] * waveScale;
        if (i === iStart) ctx.moveTo(sx, y);
        else ctx.lineTo(sx, y);
      }
      ctx.stroke();
    }

    // ─── Wave packet indicators (x₀ and σ) ───
    if (modeRef.current === "packet") {
      const curX0 = x0Ref.current;
      const curSigma = sigmaRef.current;
      const sx0 = userToScreen(curX0);
      const sLeft = userToScreen(curX0 - 2 * curSigma);
      const sRight = userToScreen(curX0 + 2 * curSigma);

      // x₀ marker (dashed vertical line)
      ctx.strokeStyle = "rgba(250,204,21,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx0, margin + 10);
      ctx.lineTo(sx0, margin + plotH - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // σ bracket (horizontal bracket at top showing ±2σ)
      const bracketY = margin + 20;
      ctx.strokeStyle = "rgba(250,204,21,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Left endcap
      ctx.moveTo(sLeft, bracketY - 4);
      ctx.lineTo(sLeft, bracketY + 4);
      // Horizontal line
      ctx.moveTo(sLeft, bracketY);
      ctx.lineTo(sRight, bracketY);
      // Right endcap
      ctx.moveTo(sRight, bracketY - 4);
      ctx.lineTo(sRight, bracketY + 4);
      ctx.stroke();

      // Label
      ctx.fillStyle = "rgba(250,204,21,0.5)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("x₀", sx0, margin + 38);
      ctx.fillText("±2σ", sx0, bracketY - 7);
    }

    // ─── Legend ───
    const legendItems: { color: string; label: string }[] = [];
    if (showProbRef.current)
      legendItems.push({ color: "rgba(167,139,250,0.9)", label: "|ψ|" });
    if (showRealRef.current)
      legendItems.push({ color: "#3b82f6", label: "Re(ψ)" });
    if (showImagRef.current)
      legendItems.push({ color: "#f97316", label: "Im(ψ)" });
    if (showPotRef.current)
      legendItems.push({ color: "rgba(136,136,160,0.5)", label: "V(x)" });

    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    let lx = margin + 8;
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, margin + 8, 14, 2);
      ctx.fillText(item.label, lx + 18, margin + 14);
      lx += ctx.measureText(item.label).width + 36;
    }

    // ─── Zoom indicator ───
    if (vs > 1.01 || vs < 0.99) {
      ctx.fillStyle = "rgba(136,136,160,0.4)";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${vs.toFixed(1)}x`, margin + plotW - 4, margin + 14);
    }
  }, []);

  // ─── Interaction: zoom, pan ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Wheel zoom (toward mouse position)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.max(
        0.5,
        Math.min(20, viewScaleRef.current * scaleFactor)
      );

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const plotW = canvas.offsetWidth - 80;
      const marginL = 40;
      const vw = 1 / viewScaleRef.current;
      const vLeft = viewCenterRef.current - vw / 2;
      const mouseUser = vLeft + ((mouseX - marginL) / plotW) * vw;

      const newVw = 1 / newScale;
      const fraction = (mouseX - marginL) / plotW;
      const newVLeft = mouseUser - fraction * newVw;
      const newCenter = newVLeft + newVw / 2;

      onViewChangeRef.current(
        Math.max(-0.2, Math.min(1.2, newCenter)),
        newScale
      );
    };

    // Mouse drag to pan
    let dragging = false;
    let lastX = 0;

    const handleMouseDown = (e: MouseEvent) => {
      // Only pan with left button when no modifier
      if (e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const deltaX = e.clientX - lastX;
      const plotW = canvas.offsetWidth - 80;
      const vw = 1 / viewScaleRef.current;
      const shift = -(deltaX / plotW) * vw;
      const nc = Math.max(
        -0.2,
        Math.min(1.2, viewCenterRef.current + shift)
      );
      onViewChangeRef.current(nc, viewScaleRef.current);
      lastX = e.clientX;
    };

    const handleMouseUp = () => {
      dragging = false;
      canvas.style.cursor = "grab";
    };

    // Touch: pinch zoom + drag pan
    const touches = new Map<number, { x: number; y: number }>();
    let lastPinchDist: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && lastPinchDist !== null) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = d / lastPinchDist;
        const newScale = Math.max(
          0.5,
          Math.min(20, viewScaleRef.current * ratio)
        );
        onViewChangeRef.current(viewCenterRef.current, newScale);
        lastPinchDist = d;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        const prev = touches.get(t.identifier);
        if (prev) {
          const deltaX = t.clientX - prev.x;
          const plotW = canvas.offsetWidth - 80;
          const vw = 1 / viewScaleRef.current;
          const shift = -(deltaX / plotW) * vw;
          const nc = Math.max(
            -0.2,
            Math.min(1.2, viewCenterRef.current + shift)
          );
          onViewChangeRef.current(nc, viewScaleRef.current);
        }
        touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        touches.delete(e.changedTouches[i].identifier);
      }
      if (e.touches.length < 2) lastPinchDist = null;
    };

    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // ─── Animation loop ───
  useEffect(() => {
    const dt = 0.005;
    let stepAccumulator = 0;

    const loop = () => {
      const state = stateRef.current;
      if (state && runningRef.current) {
        stepAccumulator += speedRef.current;
        const steps = Math.floor(stepAccumulator);
        stepAccumulator -= steps;
        for (let s = 0; s < steps; s++) {
          evolve(state, dt);
        }
        if (steps > 0) onTickRef.current();
      }
      draw();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-border"
      style={{ height: "60vh" }}
    />
  );
}
