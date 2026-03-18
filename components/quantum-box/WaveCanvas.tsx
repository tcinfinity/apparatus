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

    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    const { N, psiRe, psiIm, potential } = state;
    const margin = 40;
    const plotW = w - margin * 2;
    const plotH = h - margin * 2;
    const centerY = margin + plotH * 0.55; // slightly below center to give room for positive amplitudes

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
    ctx.fillText("0", margin, h - 12);
    ctx.fillText("L", margin + plotW, h - 12);
    ctx.fillText("x", margin + plotW / 2, h - 12);

    // Scale: auto-scale to max amplitude
    const pd = probabilityDensity(state);
    let maxAmp = 0;
    for (let i = 0; i < N; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(psiRe[i]), Math.abs(psiIm[i]), Math.sqrt(pd[i]));
    }
    const waveScale = maxAmp > 1e-10 ? (plotH * 0.35) / maxAmp : 1;

    // Potential (barrier) — drawn as filled region
    if (showPotRef.current) {
      let maxV = 0;
      for (let i = 0; i < N; i++) {
        if (isFinite(potential[i]) && potential[i] < 1e6) {
          maxV = Math.max(maxV, potential[i]);
        }
      }
      if (maxV > 0) {
        const vScale = (plotH * 0.35) / maxV;

        // Fill
        ctx.fillStyle = "rgba(136,136,160,0.12)";
        ctx.beginPath();
        ctx.moveTo(margin, centerY);
        for (let i = 0; i < N; i++) {
          const x = margin + (i / (N - 1)) * plotW;
          const v = Math.min(potential[i], maxV);
          ctx.lineTo(x, centerY - v * vScale);
        }
        ctx.lineTo(margin + plotW, centerY);
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = "rgba(136,136,160,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < N; i++) {
          const x = margin + (i / (N - 1)) * plotW;
          const v = Math.min(potential[i], maxV);
          if (v > 0.01) {
            if (!started) {
              ctx.moveTo(x, centerY - v * vScale);
              started = true;
            } else {
              ctx.lineTo(x, centerY - v * vScale);
            }
          }
        }
        ctx.stroke();

        // V₀ label
        ctx.fillStyle = "rgba(136,136,160,0.6)";
        ctx.font = "10px monospace";
        ctx.textAlign = "left";
        // Find barrier center
        for (let i = Math.floor(N * 0.3); i < N; i++) {
          if (potential[i] > 0 && potential[i] < 1e6) {
            const x = margin + (i / (N - 1)) * plotW;
            ctx.fillText("V₀", x + 4, centerY - maxV * vScale - 4);
            break;
          }
        }
      }
    }

    // Probability density |ψ|²
    if (showProbRef.current) {
      ctx.fillStyle = "rgba(124,58,237,0.12)";
      ctx.beginPath();
      ctx.moveTo(margin, centerY);
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        ctx.lineTo(x, centerY - Math.sqrt(pd[i]) * waveScale);
      }
      ctx.lineTo(margin + plotW, centerY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(167,139,250,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const y = centerY - Math.sqrt(pd[i]) * waveScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Re(ψ)
    if (showRealRef.current) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const y = centerY - psiRe[i] * waveScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Im(ψ)
    if (showImagRef.current) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = margin + (i / (N - 1)) * plotW;
        const y = centerY - psiIm[i] * waveScale;
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
    if (showPotRef.current) legendItems.push({ color: "rgba(136,136,160,0.5)", label: "V(x)" });

    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    let lx = margin + 8;
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, margin + 8, 14, 2);
      ctx.fillText(item.label, lx + 18, margin + 14);
      lx += ctx.measureText(item.label).width + 36;
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
    const dt = 0.005; // smaller dt for stability

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
