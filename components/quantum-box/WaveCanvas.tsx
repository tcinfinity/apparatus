"use client";

import { useRef, useEffect, useCallback } from "react";
import type { QuantumState } from "@/lib/physics/quantum";
import { probabilityDensity, evolve } from "@/lib/physics/quantum";

interface WaveCanvasProps {
  quantumState: QuantumState | null;
  running: boolean;
  speed: number;
  showReal: boolean;
  showImag: boolean;
  showProbability: boolean;
  showPotential: boolean;
  onTick: () => void;
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
}: WaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef(quantumState);
  stateRef.current = quantumState;

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

    // Background
    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    const { N, psiRe, psiIm, potential } = state;
    const margin = 40;
    const plotW = w - margin * 2;
    const plotH = h - margin * 2;
    const centerY = margin + plotH * 0.5;

    // Draw grid
    ctx.strokeStyle = "rgba(30,30,50,0.5)";
    ctx.lineWidth = 0.5;
    for (let gy = 0; gy <= 4; gy++) {
      const y = margin + (plotH * gy) / 4;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + plotW, y);
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = "rgba(136,136,160,0.6)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("0", margin, h - 10);
    ctx.fillText("L", margin + plotW, h - 10);
    ctx.fillText("x", margin + plotW / 2, h - 10);
    ctx.textAlign = "right";
    ctx.fillText("ψ", margin - 8, centerY + 4);

    // X-axis
    ctx.strokeStyle = "rgba(136,136,160,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, centerY);
    ctx.lineTo(margin + plotW, centerY);
    ctx.stroke();

    // Scale factor for wave function display
    const pd = probabilityDensity(state);
    let maxAmp = 0;
    for (let i = 0; i < N; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(psiRe[i]), Math.abs(psiIm[i]), Math.sqrt(pd[i]));
    }
    const scale = maxAmp > 0 ? (plotH * 0.4) / maxAmp : 1;

    // Potential display
    if (showPotRef.current) {
      let maxV = 0;
      for (let i = 0; i < N; i++) {
        if (isFinite(potential[i]) && potential[i] < 1e6) {
          maxV = Math.max(maxV, potential[i]);
        }
      }
      const vScale = maxV > 0 ? (plotH * 0.4) / maxV : 0;

      ctx.fillStyle = "rgba(251,191,36,0.08)";
      ctx.strokeStyle = "rgba(251,191,36,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margin, centerY);
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const v = Math.min(potential[i], maxV);
        const y = centerY - v * vScale;
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(margin + plotW, centerY);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const v = Math.min(potential[i], maxV);
        const y = centerY - v * vScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw probability density |ψ|²
    if (showProbRef.current) {
      ctx.fillStyle = "rgba(124,58,237,0.15)";
      ctx.strokeStyle = "rgba(167,139,250,0.9)";
      ctx.lineWidth = 2;

      // Fill
      ctx.beginPath();
      ctx.moveTo(margin, centerY);
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const y = centerY - Math.sqrt(pd[i]) * scale;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(margin + plotW, centerY);
      ctx.closePath();
      ctx.fill();

      // Stroke
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const y = centerY - Math.sqrt(pd[i]) * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw Re(ψ)
    if (showRealRef.current) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const y = centerY - psiRe[i] * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw Im(ψ)
    if (showImagRef.current) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const y = centerY - psiIm[i] * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Legend
    const legendItems: { color: string; label: string }[] = [];
    if (showProbRef.current) legendItems.push({ color: "rgba(167,139,250,0.9)", label: "|ψ|" });
    if (showRealRef.current) legendItems.push({ color: "#3b82f6", label: "Re(ψ)" });
    if (showImagRef.current) legendItems.push({ color: "#f97316", label: "Im(ψ)" });
    if (showPotRef.current) legendItems.push({ color: "rgba(251,191,36,0.5)", label: "V(x)" });

    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    let lx = margin + 8;
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, margin + 8, 12, 2);
      ctx.fillText(item.label, lx + 16, margin + 14);
      lx += ctx.measureText(item.label).width + 30;
    }

    // Box walls
    ctx.strokeStyle = "rgba(136,136,160,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, margin + plotH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin + plotW, margin);
    ctx.lineTo(margin + plotW, margin + plotH);
    ctx.stroke();
  }, []);

  useEffect(() => {
    const dt = 0.05;

    const loop = () => {
      const state = stateRef.current;
      if (state && runningRef.current) {
        const steps = Math.max(1, Math.round(speedRef.current));
        for (let s = 0; s < steps; s++) {
          evolve(state, dt);
        }
        onTickRef.current();
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
