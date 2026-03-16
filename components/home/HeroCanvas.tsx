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
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18 * scale);
  grad.addColorStop(0, "rgba(124,58,237,0.5)");
  grad.addColorStop(0.6, "rgba(124,58,237,0.15)");
  grad.addColorStop(1, "rgba(124,58,237,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 18 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Nucleus cluster: protons (purple) and neutrons (blue-gray)
  const nucleons = [
    { dx: 0, dy: 0, r: 3.5, color: "rgba(167,139,250,0.9)" },       // proton
    { dx: -3.5, dy: -2.5, r: 3.2, color: "rgba(148,163,184,0.7)" }, // neutron
    { dx: 3.2, dy: -2, r: 3.3, color: "rgba(167,139,250,0.85)" },   // proton
    { dx: -2, dy: 3, r: 3.0, color: "rgba(148,163,184,0.65)" },     // neutron
    { dx: 2.5, dy: 3.2, r: 3.1, color: "rgba(167,139,250,0.8)" },   // proton
    { dx: -4, dy: 0.5, r: 2.8, color: "rgba(167,139,250,0.75)" },   // proton
    { dx: 4.2, dy: 0.8, r: 2.9, color: "rgba(148,163,184,0.6)" },   // neutron
    { dx: 0.5, dy: -4, r: 3.0, color: "rgba(148,163,184,0.65)" },   // neutron
  ];

  for (const n of nucleons) {
    ctx.fillStyle = n.color;
    ctx.beginPath();
    ctx.arc(cx + n.dx * scale, cy + n.dy * scale, n.r * scale, 0, Math.PI * 2);
    ctx.fill();
  }

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

// ─── Lab Beakers ─────────────────────────────────────────
function drawBeakers(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  scale: number
) {
  const bw = 32 * scale; // narrower beaker
  const bh = 85 * scale; // taller beaker
  const gap = 40 * scale;
  const taper = 5 * scale;
  const lipH = 5 * scale;
  const spoutW = 6 * scale;

  // Cycle: 0-1 pour left→right, 1-2 pour right→left
  const cycle = (time * 0.25) % 2;
  const pouringRight = cycle < 1;
  const t = pouringRight ? cycle : cycle - 1;

  // Smooth easing for tilt
  const tiltProgress = Math.sin(t * Math.PI); // 0→1→0

  const leftCX = cx - gap - bw / 2;
  const rightCX = cx + gap + bw / 2;
  const baseY = cy + bh / 2;

  // Draw a single beaker (centered at bx, baseY is bottom)
  function drawBeaker(
    bx: number,
    fillLevel: number,
    tiltAngle: number
  ) {
    ctx.save();
    ctx.translate(bx, baseY);
    ctx.rotate(tiltAngle);

    const topY = -bh;
    const botY = 0;

    // Beaker body — slight taper, taller
    ctx.strokeStyle = "rgba(124,58,237,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Left wall
    ctx.moveTo(-bw / 2 - taper, topY);
    ctx.lineTo(-bw / 2, botY);
    // Bottom
    ctx.lineTo(bw / 2, botY);
    // Right wall
    ctx.lineTo(bw / 2 + taper, topY);
    ctx.stroke();

    // Spout lip (left side)
    ctx.beginPath();
    ctx.moveTo(-bw / 2 - taper, topY);
    ctx.lineTo(-bw / 2 - taper - spoutW, topY - lipH);
    ctx.stroke();
    // Spout lip (right side)
    ctx.beginPath();
    ctx.moveTo(bw / 2 + taper, topY);
    ctx.lineTo(bw / 2 + taper + spoutW, topY - lipH);
    ctx.stroke();

    // Graduation marks
    ctx.strokeStyle = "rgba(124,58,237,0.12)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 5; i++) {
      const my = botY - (bh * i) / 6;
      const mTaper = taper * (1 - i / 6);
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - mTaper, my);
      ctx.lineTo(-bw / 2 - mTaper + 6 * scale, my);
      ctx.stroke();
    }

    // Liquid
    if (fillLevel > 0.01) {
      const liqH = fillLevel * bh * 0.85;
      const liqTop = botY - liqH;
      const liqTaper = taper * (liqH / bh);
      ctx.fillStyle = "rgba(96,165,250,0.2)";
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - liqTaper, liqTop);
      ctx.lineTo(bw / 2 + liqTaper, liqTop);
      ctx.lineTo(bw / 2, botY);
      ctx.lineTo(-bw / 2, botY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // Compute fill levels and tilts
  let leftFill: number, rightFill: number;
  let leftTilt: number, rightTilt: number;
  if (pouringRight) {
    leftFill = 0.7 * (1 - t);
    rightFill = 0.7 * t;
    leftTilt = -tiltProgress * 0.5; // tilt left beaker to pour right
    rightTilt = 0;
  } else {
    leftFill = 0.7 * t;
    rightFill = 0.7 * (1 - t);
    leftTilt = 0;
    rightTilt = tiltProgress * 0.5; // tilt right beaker to pour left
  }

  drawBeaker(leftCX, leftFill, leftTilt);
  drawBeaker(rightCX, rightFill, rightTilt);

  // Pour arc from tilted spout
  if (tiltProgress > 0.1) {
    const fromBx = pouringRight ? leftCX : rightCX;
    const toBx = pouringRight ? rightCX : leftCX;
    const tiltAngle = pouringRight ? leftTilt : rightTilt;

    // Spout position after tilt
    const spoutLocalX = pouringRight
      ? bw / 2 + taper + spoutW
      : -(bw / 2 + taper + spoutW);
    const spoutLocalY = -bh - lipH;
    const cosA = Math.cos(tiltAngle);
    const sinA = Math.sin(tiltAngle);
    const fromX = fromBx + spoutLocalX * cosA - spoutLocalY * sinA;
    const fromY = baseY + spoutLocalX * sinA + spoutLocalY * cosA;

    const toX = toBx;
    const toY = baseY - bh + 10 * scale;

    ctx.strokeStyle = `rgba(96,165,250,${0.35 * tiltProgress})`;
    ctx.lineWidth = 2.5 * scale * tiltProgress;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(
      (fromX + toX) / 2,
      Math.min(fromY, toY) - 20 * scale * tiltProgress,
      toX,
      toY
    );
    ctx.stroke();
  }
}

// ─── Burette + Flask with Swirling ───────────────────────
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

  // Burette liquid level (decreasing over time)
  const buretteFill = 0.8 - ((time * 0.05) % 0.6);
  if (buretteFill > 0.05) {
    const buretteLiqTop = buretteBot - buretteFill * (buretteBot - buretteTop);
    ctx.fillStyle = "rgba(96,165,250,0.15)";
    ctx.fillRect(
      buretteX - buretteW / 2 + 1,
      buretteLiqTop,
      buretteW - 2,
      buretteBot - buretteLiqTop
    );
  }

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

  // Flask swirl offset
  const swirlOffset = Math.sin(time * 2.5) * 4 * scale;

  // Conical flask (with swirl offset)
  const flaskCX = buretteX + swirlOffset;
  const flaskTop = cy + 20 * scale;
  const flaskBot = cy + 70 * scale;
  const flaskTopW = 12 * scale;
  const flaskBotW = 45 * scale;

  ctx.strokeStyle = "rgba(124,58,237,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Neck
  ctx.moveTo(flaskCX - flaskTopW / 2, flaskTop - 15 * scale);
  ctx.lineTo(flaskCX - flaskTopW / 2, flaskTop);
  // Body
  ctx.lineTo(flaskCX - flaskBotW / 2, flaskBot);
  ctx.lineTo(flaskCX + flaskBotW / 2, flaskBot);
  ctx.lineTo(flaskCX + flaskTopW / 2, flaskTop);
  ctx.lineTo(flaskCX + flaskTopW / 2, flaskTop - 15 * scale);
  ctx.stroke();

  // Color transition: colorless → pale yellow → orange → pink
  const colorCycle = (time * 0.15) % 4;
  let r: number, g: number, b: number, a: number;
  if (colorCycle < 1) {
    const p = colorCycle;
    r = Math.round(200 * p);
    g = Math.round(200 * p);
    b = Math.round(180 * (1 - p));
    a = 0.08 + 0.12 * p;
  } else if (colorCycle < 2) {
    const p = colorCycle - 1;
    r = Math.round(200 + 45 * p);
    g = Math.round(200 - 34 * p);
    b = Math.round(20 * (1 - p));
    a = 0.2 + 0.05 * p;
  } else if (colorCycle < 3) {
    const p = colorCycle - 2;
    r = Math.round(245 - 25 * p);
    g = Math.round(166 - 66 * p);
    b = Math.round(35 + 100 * p);
    a = 0.25;
  } else {
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
  ctx.moveTo(flaskCX - topWidth, liqTop);
  ctx.lineTo(flaskCX - flaskBotW / 2, flaskBot);
  ctx.lineTo(flaskCX + flaskBotW / 2, flaskBot);
  ctx.lineTo(flaskCX + topWidth, liqTop);
  ctx.closePath();
  ctx.fill();

  // Swirl pattern inside liquid
  const swirlCenterY = (liqTop + flaskBot) / 2;
  const swirlR = (flaskBotW / 2) * 0.4;
  ctx.strokeStyle = `rgba(${Math.min(r + 40, 255)},${Math.min(g + 40, 255)},${Math.min(b + 40, 255)},${Math.min(a + 0.1, 0.4)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t2 = i / 40;
    const spiralAngle = t2 * Math.PI * 3 + time * 3;
    const spiralR = swirlR * t2;
    const sx = flaskCX + Math.cos(spiralAngle) * spiralR;
    const sy = swirlCenterY + Math.sin(spiralAngle) * spiralR * 0.5;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // Droplets falling (from burette nozzle toward flask neck)
  const dropInterval = 1.2;
  const dropTime = time % dropInterval;
  const dropStartY = buretteBot + 8 * scale;
  const dropEndY = flaskTop - 15 * scale;
  const dropProgress = dropTime / dropInterval;
  const dropY =
    dropStartY + (dropEndY - dropStartY) * dropProgress * dropProgress;

  if (dropY < dropEndY) {
    // Droplet follows a slight arc toward the swirling flask
    const dropX = buretteX + swirlOffset * dropProgress * dropProgress;
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(a, 0.3)})`;
    ctx.beginPath();
    ctx.ellipse(dropX, dropY, 2 * scale, 3 * scale, 0, 0, Math.PI * 2);
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

    const startTime = performance.now();

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
      className="absolute inset-0 h-full w-full opacity-60"
      style={{ pointerEvents: "none" }}
    />
  );
}
