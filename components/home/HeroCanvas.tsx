"use client";

import { useEffect, useRef } from "react";

// ─── Bohr Atom ───────────────────────────────────────────
function drawAtom(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  scale: number
) {
  // Nucleus glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14 * scale);
  grad.addColorStop(0, "rgba(124,58,237,0.6)");
  grad.addColorStop(0.5, "rgba(124,58,237,0.2)");
  grad.addColorStop(1, "rgba(124,58,237,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 14 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Nucleus core
  ctx.fillStyle = "rgba(167,139,250,0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, 4 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Orbits and electrons
  const orbits = [
    { rx: 40 * scale, ry: 18 * scale, speed: 1.2, tilt: -0.3 },
    { rx: 65 * scale, ry: 28 * scale, speed: 0.8, tilt: 0.4 },
    { rx: 90 * scale, ry: 38 * scale, speed: 0.5, tilt: -0.1 },
  ];

  for (const orbit of orbits) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(orbit.tilt);

    // Orbit path
    ctx.strokeStyle = "rgba(124,58,237,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Electron
    const angle = time * orbit.speed;
    const ex = Math.cos(angle) * orbit.rx;
    const ey = Math.sin(angle) * orbit.ry;

    const eGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 6 * scale);
    eGrad.addColorStop(0, "rgba(167,139,250,0.9)");
    eGrad.addColorStop(1, "rgba(167,139,250,0)");
    ctx.fillStyle = eGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, 6 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(220,210,255,0.95)";
    ctx.beginPath();
    ctx.arc(ex, ey, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ─── Beakers ─────────────────────────────────────────────
function drawBeakers(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  scale: number
) {
  const bw = 50 * scale; // beaker width at top
  const bh = 65 * scale; // beaker height
  const gap = 30 * scale;
  const taper = 8 * scale;

  // Cycle: 0-1 pour left→right, 1-2 pour right→left
  const cycle = (time * 0.3) % 2;
  const pouringRight = cycle < 1;
  const t = pouringRight ? cycle : cycle - 1;

  const leftX = cx - gap - bw;
  const rightX = cx + gap;
  const topY = cy - bh / 2;
  const botY = cy + bh / 2;

  // Draw beaker outline
  function drawBeaker(x: number, fillLevel: number) {
    ctx.strokeStyle = "rgba(124,58,237,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - taper, topY);
    ctx.lineTo(x - taper - 4 * scale, topY - 6 * scale); // lip left
    ctx.moveTo(x - taper, topY);
    ctx.lineTo(x + bw + taper, topY);
    ctx.lineTo(x + bw + taper + 4 * scale, topY - 6 * scale); // lip right
    ctx.moveTo(x + bw + taper, topY);
    ctx.lineTo(x + bw, botY);
    ctx.lineTo(x, botY);
    ctx.lineTo(x - taper, topY);
    ctx.stroke();

    // Liquid
    if (fillLevel > 0.01) {
      const liqTop = botY - fillLevel * bh;
      const liqTaperLeft =
        x - taper + (taper * (botY - liqTop)) / bh;
      const liqTaperRight =
        x + bw + taper - (taper * (botY - liqTop)) / bh;
      // Interpolate taper
      const leftEdge = x + (1 - fillLevel) * (-taper);
      const rightEdge = x + bw + (1 - fillLevel) * taper;
      ctx.fillStyle = "rgba(96,165,250,0.2)";
      ctx.beginPath();
      ctx.moveTo(leftEdge, liqTop);
      ctx.lineTo(rightEdge, liqTop);
      ctx.lineTo(x + bw, botY);
      ctx.lineTo(x, botY);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Compute fill levels
  let leftFill: number, rightFill: number;
  if (pouringRight) {
    leftFill = 0.7 * (1 - t);
    rightFill = 0.7 * t;
  } else {
    leftFill = 0.7 * t;
    rightFill = 0.7 * (1 - t);
  }

  drawBeaker(leftX, leftFill);
  drawBeaker(rightX, rightFill);

  // Pour arc
  const pourT = Math.sin(t * Math.PI); // 0→1→0 smooth
  if (pourT > 0.05) {
    const fromX = pouringRight ? leftX + bw + taper : rightX - taper;
    const toX = pouringRight ? rightX - taper : leftX + bw + taper;
    const fromY = topY;
    const toY = topY + 5 * scale;

    ctx.strokeStyle = `rgba(96,165,250,${0.3 * pourT})`;
    ctx.lineWidth = 3 * scale * pourT;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(
      (fromX + toX) / 2,
      fromY - 30 * scale * pourT,
      toX,
      toY
    );
    ctx.stroke();
  }
}

// ─── Burette + Flask ─────────────────────────────────────
function drawTitration(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  scale: number
) {
  const buretteX = cx;
  const buretteTop = cy - 80 * scale;
  const buretteBot = cy - 10 * scale;
  const buretteW = 8 * scale;

  // Burette body
  ctx.strokeStyle = "rgba(124,58,237,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(
    buretteX - buretteW / 2,
    buretteTop,
    buretteW,
    buretteBot - buretteTop
  );
  ctx.stroke();

  // Stopcock
  ctx.fillStyle = "rgba(124,58,237,0.2)";
  ctx.fillRect(
    buretteX - buretteW,
    buretteBot - 4 * scale,
    buretteW * 2,
    4 * scale
  );

  // Nozzle
  ctx.strokeStyle = "rgba(124,58,237,0.25)";
  ctx.beginPath();
  ctx.moveTo(buretteX - 2 * scale, buretteBot);
  ctx.lineTo(buretteX - 2 * scale, buretteBot + 8 * scale);
  ctx.lineTo(buretteX + 2 * scale, buretteBot + 8 * scale);
  ctx.lineTo(buretteX + 2 * scale, buretteBot);
  ctx.stroke();

  // Conical flask
  const flaskTop = cy + 20 * scale;
  const flaskBot = cy + 70 * scale;
  const flaskTopW = 12 * scale;
  const flaskBotW = 45 * scale;

  ctx.strokeStyle = "rgba(124,58,237,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Neck
  ctx.moveTo(buretteX - flaskTopW / 2, flaskTop - 15 * scale);
  ctx.lineTo(buretteX - flaskTopW / 2, flaskTop);
  // Body
  ctx.lineTo(buretteX - flaskBotW / 2, flaskBot);
  ctx.lineTo(buretteX + flaskBotW / 2, flaskBot);
  ctx.lineTo(buretteX + flaskTopW / 2, flaskTop);
  ctx.lineTo(buretteX + flaskTopW / 2, flaskTop - 15 * scale);
  ctx.stroke();

  // Color transition: colorless → pale yellow → orange → pink
  const colorCycle = (time * 0.15) % 4; // 4 phases
  let r: number, g: number, b: number, a: number;
  if (colorCycle < 1) {
    // Colorless to pale yellow
    const p = colorCycle;
    r = Math.round(200 * p);
    g = Math.round(200 * p);
    b = Math.round(180 * (1 - p));
    a = 0.08 + 0.12 * p;
  } else if (colorCycle < 2) {
    // Pale yellow to orange
    const p = colorCycle - 1;
    r = Math.round(200 + 45 * p);
    g = Math.round(200 - 34 * p);
    b = Math.round(20 * (1 - p));
    a = 0.2 + 0.05 * p;
  } else if (colorCycle < 3) {
    // Orange to pink
    const p = colorCycle - 2;
    r = Math.round(245 - 25 * p);
    g = Math.round(166 - 66 * p);
    b = Math.round(35 + 100 * p);
    a = 0.25;
  } else {
    // Pink back to colorless
    const p = colorCycle - 3;
    r = Math.round(220 * (1 - p));
    g = Math.round(100 * (1 - p));
    b = Math.round(135 * (1 - p));
    a = 0.25 * (1 - p) + 0.08 * p;
  }

  // Flask liquid
  const fillLevel = 0.55;
  const liqTop = flaskBot - fillLevel * (flaskBot - flaskTop);
  const topWidth =
    flaskTopW / 2 +
    ((flaskBotW / 2 - flaskTopW / 2) * (liqTop - flaskTop)) /
      (flaskBot - flaskTop);
  ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  ctx.beginPath();
  ctx.moveTo(buretteX - topWidth, liqTop);
  ctx.lineTo(buretteX - flaskBotW / 2, flaskBot);
  ctx.lineTo(buretteX + flaskBotW / 2, flaskBot);
  ctx.lineTo(buretteX + topWidth, liqTop);
  ctx.closePath();
  ctx.fill();

  // Droplets falling
  const dropInterval = 1.2;
  const dropTime = time % dropInterval;
  const dropStartY = buretteBot + 8 * scale;
  const dropEndY = liqTop;
  const dropProgress = dropTime / dropInterval;
  // Accelerate with gravity feel
  const dropY =
    dropStartY + (dropEndY - dropStartY) * dropProgress * dropProgress;

  if (dropY < dropEndY) {
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(a, 0.3)})`;
    ctx.beginPath();
    ctx.ellipse(buretteX, dropY, 2 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Main Component ──────────────────────────────────────
export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTime = performance.now();

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw(now: number) {
      const t = (now - startTime) / 1000;
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const scale = Math.min(w / 1200, h / 600, 1);

      ctx!.clearRect(0, 0, w, h);

      // Three zones: left third, center, right third
      drawAtom(ctx!, w * 0.18, h * 0.45, t, scale);
      drawBeakers(ctx!, w * 0.5, h * 0.5, t, scale);
      drawTitration(ctx!, w * 0.82, h * 0.45, t, scale);

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full opacity-40"
      style={{ pointerEvents: "none" }}
    />
  );
}
