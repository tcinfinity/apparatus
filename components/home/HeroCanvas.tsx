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
    { dx: 0, dy: 0, r: 3.5, color: "rgba(167,139,250,0.9)" },
    { dx: -3.5, dy: -2.5, r: 3.2, color: "rgba(148,163,184,0.7)" },
    { dx: 3.2, dy: -2, r: 3.3, color: "rgba(167,139,250,0.85)" },
    { dx: -2, dy: 3, r: 3.0, color: "rgba(148,163,184,0.65)" },
    { dx: 2.5, dy: 3.2, r: 3.1, color: "rgba(167,139,250,0.8)" },
    { dx: -4, dy: 0.5, r: 2.8, color: "rgba(167,139,250,0.75)" },
    { dx: 4.2, dy: 0.8, r: 2.9, color: "rgba(148,163,184,0.6)" },
    { dx: 0.5, dy: -4, r: 3.0, color: "rgba(148,163,184,0.65)" },
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

    ctx.strokeStyle = "rgba(124,58,237,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

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
  const bw = 30 * scale;
  const bh = 75 * scale;
  const gap = 35 * scale;
  const taper = 4 * scale;
  const lipH = 4 * scale;
  const spoutW = 5 * scale;

  // Cycle: 0→1 pour L→R, 1→1.5 pause, 1.5→2.5 pour R→L, 2.5→3 pause
  const totalCycle = 3.0;
  const cycle = (time * 0.25) % totalCycle;
  let pouringRight: boolean;
  let t: number;
  let isPaused: boolean;

  if (cycle < 1) {
    pouringRight = true;
    t = cycle;
    isPaused = false;
  } else if (cycle < 1.5) {
    pouringRight = true;
    t = 1;
    isPaused = true;
  } else if (cycle < 2.5) {
    pouringRight = false;
    t = cycle - 1.5;
    isPaused = false;
  } else {
    pouringRight = false;
    t = 1;
    isPaused = true;
  }

  const tiltProgress = isPaused ? 0 : Math.sin(t * Math.PI);
  const liftAmount = 30 * scale;

  const leftCX = cx - gap - bw / 2;
  const rightCX = cx + gap + bw / 2;
  const baseY = cy + bh / 2;

  function drawBeaker(
    bx: number,
    fillLevel: number,
    tiltAngle: number,
    yOffset: number,
    spoutSide: "left" | "right"
  ) {
    ctx.save();
    // Pivot at the bottom center of the beaker for natural tilting
    ctx.translate(bx, baseY - yOffset);
    ctx.rotate(tiltAngle);

    const topY = -bh;
    const botY = 0;

    // Glass body — subtle fill for glassy look
    ctx.fillStyle = "rgba(124,58,237,0.03)";
    ctx.beginPath();
    ctx.moveTo(-bw / 2 - taper, topY);
    ctx.lineTo(-bw / 2, botY);
    ctx.lineTo(bw / 2, botY);
    ctx.lineTo(bw / 2 + taper, topY);
    ctx.closePath();
    ctx.fill();

    // Glass outline
    ctx.strokeStyle = "rgba(124,58,237,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-bw / 2 - taper, topY);
    ctx.lineTo(-bw / 2, botY);
    ctx.lineTo(bw / 2, botY);
    ctx.lineTo(bw / 2 + taper, topY);
    ctx.stroke();

    // Spout — small pouring lip on the side facing the other beaker
    if (spoutSide === "right") {
      ctx.beginPath();
      ctx.moveTo(bw / 2 + taper, topY);
      ctx.quadraticCurveTo(bw / 2 + taper + spoutW * 0.5, topY - lipH * 0.5, bw / 2 + taper + spoutW, topY - lipH);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - taper, topY);
      ctx.quadraticCurveTo(-bw / 2 - taper - spoutW * 0.5, topY - lipH * 0.5, -bw / 2 - taper - spoutW, topY - lipH);
      ctx.stroke();
    }

    // Glass reflection — vertical highlight near left wall
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-bw / 2 - taper + 3, topY + 8);
    ctx.lineTo(-bw / 2 + 3, botY - 4);
    ctx.stroke();

    // Glass reflection — small horizontal shine near top
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-bw / 4, topY + bh * 0.12);
    ctx.lineTo(bw / 6, topY + bh * 0.1);
    ctx.stroke();

    // Graduation marks
    ctx.strokeStyle = "rgba(124,58,237,0.15)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 4; i++) {
      const my = botY - (bh * i) / 5;
      const mt = taper * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - mt, my);
      ctx.lineTo(-bw / 2 - mt + 5 * scale, my);
      ctx.stroke();
    }

    // Liquid
    if (fillLevel > 0.01) {
      const liqH = fillLevel * bh * 0.85;
      const liqTop = botY - liqH;
      const liqTaper = taper * (liqH / bh);
      ctx.fillStyle = "rgba(96,165,250,0.25)";
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - liqTaper, liqTop);
      // Meniscus
      ctx.quadraticCurveTo(0, liqTop + 2 * scale, bw / 2 + liqTaper, liqTop);
      ctx.lineTo(bw / 2, botY);
      ctx.lineTo(-bw / 2, botY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  let leftFill: number, rightFill: number;
  let leftTilt: number, rightTilt: number;
  let leftLift: number, rightLift: number;

  if (pouringRight) {
    // Left beaker pours right: tilt CLOCKWISE (positive angle in canvas coords)
    // so the right-side spout tips downward toward the right beaker
    leftFill = isPaused ? 0 : 0.7 * (1 - t);
    rightFill = isPaused ? 0.7 : 0.7 * t;
    leftTilt = tiltProgress * 0.45;
    rightTilt = 0;
    leftLift = tiltProgress * liftAmount;
    rightLift = 0;
  } else {
    // Right beaker pours left: tilt COUNTER-CLOCKWISE (negative angle)
    // so the left-side spout tips downward toward the left beaker
    leftFill = isPaused ? 0.7 : 0.7 * t;
    rightFill = isPaused ? 0 : 0.7 * (1 - t);
    leftTilt = 0;
    rightTilt = -tiltProgress * 0.45;
    leftLift = 0;
    rightLift = tiltProgress * liftAmount;
  }

  drawBeaker(leftCX, leftFill, leftTilt, leftLift, "right");
  drawBeaker(rightCX, rightFill, rightTilt, rightLift, "left");

  // Pour arc from tilted spout
  if (tiltProgress > 0.15) {
    const fromBx = pouringRight ? leftCX : rightCX;
    const toBx = pouringRight ? rightCX : leftCX;
    const tiltAngle = pouringRight ? leftTilt : rightTilt;
    const fromLift = pouringRight ? leftLift : rightLift;

    // Compute spout tip position in world coords after rotation + lift
    const spoutLocalX = pouringRight
      ? bw / 2 + taper + spoutW
      : -(bw / 2 + taper + spoutW);
    const spoutLocalY = -bh - lipH;
    const cosA = Math.cos(tiltAngle);
    const sinA = Math.sin(tiltAngle);
    const fromX = fromBx + spoutLocalX * cosA - spoutLocalY * sinA;
    const fromY = (baseY - fromLift) + spoutLocalX * sinA + spoutLocalY * cosA;

    // Pour into the other beaker's opening
    const toX = toBx;
    const toY = baseY - bh + 8 * scale;

    ctx.strokeStyle = `rgba(96,165,250,${0.35 * tiltProgress})`;
    ctx.lineWidth = 2 * scale * tiltProgress;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(
      (fromX + toX) / 2,
      Math.min(fromY, toY) - 15 * scale * tiltProgress,
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
  ctx.strokeStyle = "rgba(124,58,237,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(
    buretteX - buretteW / 2,
    buretteTop,
    buretteW,
    buretteBot - buretteTop
  );
  ctx.stroke();

  // Burette liquid level
  const buretteFill = 0.8 - ((time * 0.05) % 0.6);
  if (buretteFill > 0.05) {
    const buretteLiqTop = buretteBot - buretteFill * (buretteBot - buretteTop);
    ctx.fillStyle = "rgba(96,165,250,0.2)";
    ctx.fillRect(
      buretteX - buretteW / 2 + 1,
      buretteLiqTop,
      buretteW - 2,
      buretteBot - buretteLiqTop
    );
  }

  // Stopcock
  ctx.fillStyle = "rgba(124,58,237,0.25)";
  ctx.fillRect(
    buretteX - buretteW,
    buretteBot - 4 * scale,
    buretteW * 2,
    4 * scale
  );

  // Nozzle
  ctx.strokeStyle = "rgba(124,58,237,0.4)";
  ctx.beginPath();
  ctx.moveTo(buretteX - 2 * scale, buretteBot);
  ctx.lineTo(buretteX - 2 * scale, buretteBot + 8 * scale);
  ctx.lineTo(buretteX + 2 * scale, buretteBot + 8 * scale);
  ctx.lineTo(buretteX + 2 * scale, buretteBot);
  ctx.stroke();

  // Flask swirl offset (halved) + tilt
  const swirlOffset = Math.sin(time * 2.5) * 2 * scale;
  const swirlTilt = Math.sin(time * 2.5) * 0.04;

  // Conical flask
  const flaskCX = buretteX + swirlOffset;
  const flaskTop = cy + 20 * scale;
  const flaskBot = cy + 70 * scale;
  const flaskTopW = 12 * scale;
  const flaskBotW = 45 * scale;

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

  // Flask liquid measurements (needed before flask drawing for drop target)
  const fillLevel = 0.55;
  const liqTop = flaskBot - fillLevel * (flaskBot - flaskTop);
  const topWidth =
    flaskTopW / 2 +
    ((flaskBotW / 2 - flaskTopW / 2) * (liqTop - flaskTop)) /
      (flaskBot - flaskTop);

  // Draw flask with tilt (save/restore around the tilting flask)
  ctx.save();
  ctx.translate(flaskCX, flaskBot);
  ctx.rotate(swirlTilt);
  ctx.translate(-flaskCX, -flaskBot);

  // Flask outline
  ctx.strokeStyle = "rgba(124,58,237,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(flaskCX - flaskTopW / 2, flaskTop - 15 * scale);
  ctx.lineTo(flaskCX - flaskTopW / 2, flaskTop);
  ctx.lineTo(flaskCX - flaskBotW / 2, flaskBot);
  ctx.lineTo(flaskCX + flaskBotW / 2, flaskBot);
  ctx.lineTo(flaskCX + flaskTopW / 2, flaskTop);
  ctx.lineTo(flaskCX + flaskTopW / 2, flaskTop - 15 * scale);
  ctx.stroke();

  // Flask liquid with concave meniscus
  ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  ctx.beginPath();
  ctx.moveTo(flaskCX - topWidth, liqTop);
  // Concave meniscus — curves downward in the center
  ctx.quadraticCurveTo(flaskCX, liqTop + 4 * scale, flaskCX + topWidth, liqTop);
  ctx.lineTo(flaskCX + flaskBotW / 2, flaskBot);
  ctx.lineTo(flaskCX - flaskBotW / 2, flaskBot);
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

  ctx.restore(); // end flask tilt transform

  // Droplets falling (from burette nozzle down to liquid surface)
  const dropInterval = 1.2;
  const dropTime = time % dropInterval;
  const dropStartY = buretteBot + 8 * scale;
  const dropEndY = liqTop; // target is the liquid surface, not the flask neck
  const dropProgress = dropTime / dropInterval;
  const dropY =
    dropStartY + (dropEndY - dropStartY) * dropProgress * dropProgress;

  if (dropY < dropEndY) {
    // Droplet follows a slight arc toward the swirling flask
    const dropX = buretteX + swirlOffset * dropProgress * dropProgress;
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(a, 0.35)})`;
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
