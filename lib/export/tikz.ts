import type { Lens, LensObject, ImageInfo } from "@/components/lens-builder/types";
import { getEffectiveFocalLength, computeImageThroughLens } from "@/lib/physics/optics";

const SCALE = 0.02; // sim units → cm

function fmt(v: number): string {
  return (v * SCALE).toFixed(3);
}

/**
 * Compute the "bulge" (half-width) of a lens surface for TikZ drawing.
 * Returns a value in sim units representing how far the arc protrudes.
 */
function lensBulge(R: number, halfHeight: number): number {
  if (!isFinite(R) || Math.abs(R) > 1e4) return 0;
  // For a spherical surface of radius R, the sagitta for height h is:
  // s = R - sqrt(R^2 - h^2), but for visual purposes we use a simpler mapping
  const absR = Math.abs(R);
  const h = halfHeight;
  if (absR < h) return h * 0.4 * Math.sign(R);
  const sag = absR - Math.sqrt(absR * absR - h * h);
  return sag * Math.sign(R);
}

export function generateTikZ(
  lenses: Lens[],
  objects: LensObject[],
  images: ImageInfo[],
  positionOrigin: number
): string {
  const sorted = [...lenses].sort((a, b) => a.position - b.position);
  const lines: string[] = [];

  lines.push("\\documentclass[border=10pt]{standalone}");
  lines.push("\\usepackage{tikz}");
  lines.push("\\begin{document}");
  lines.push("\\begin{tikzpicture}[>=stealth, scale=1, every node/.style={font=\\small}]");
  lines.push("");

  // Determine axis range
  const allX = [
    ...lenses.map(l => l.position),
    ...objects.map(o => o.position),
    ...images.filter(i => isFinite(i.position) && Math.abs(i.position) < 2000).map(i => i.position),
  ];
  const minX = Math.min(-300, ...allX) - 80;
  const maxX = Math.max(300, ...allX) + 80;

  // Optical axis
  lines.push(`  % Optical axis`);
  lines.push(`  \\draw[dashed, gray!60] (${fmt(minX)},0) -- (${fmt(maxX)},0);`);
  lines.push("");

  // Lenses — draw as proper biconvex/biconcave shapes with fill
  for (let i = 0; i < sorted.length; i++) {
    const lens = sorted[i];
    const f = getEffectiveFocalLength(lens);
    const x = lens.position;
    const h = lens.height * 0.5;
    const num = i + 1;

    lines.push(`  % Lens L_{${num}} (${lens.type})`);

    // Compute surface bulges
    let bulge1: number, bulge2: number;
    if (lens.allowDifferentCurvature) {
      bulge1 = lensBulge(lens.r1, h);
      bulge2 = lensBulge(lens.r2, h);
    } else {
      switch (lens.type) {
        case "biconvex":
          bulge1 = h * 0.25;
          bulge2 = -h * 0.25;
          break;
        case "biconcave":
          bulge1 = -h * 0.2;
          bulge2 = h * 0.2;
          break;
        case "plano-convex":
          bulge1 = 0;
          bulge2 = -h * 0.25;
          break;
        case "plano-concave":
          bulge1 = 0;
          bulge2 = h * 0.2;
          break;
        default:
          bulge1 = h * 0.25;
          bulge2 = -h * 0.25;
      }
    }

    // Draw lens as a filled shape: two arcs connected at top and bottom
    // Left surface: arc from (x, -h) through (x + bulge1, 0) to (x, h)
    // Right surface: arc from (x, h) through (x - bulge2, 0) to (x, -h)
    const lx = fmt(x);
    const ht = fmt(h);
    const hb = fmt(-h);
    const b1 = fmt(x + bulge1);
    const b2 = fmt(x - bulge2);

    // Fill with light blue
    lines.push(`  \\fill[cyan!10] (${lx},${hb}) .. controls (${b1},${hb}) and (${b1},${ht}) .. (${lx},${ht})`);
    lines.push(`    .. controls (${b2},${ht}) and (${b2},${hb}) .. cycle;`);
    // Outline
    lines.push(`  \\draw[thick] (${lx},${hb}) .. controls (${b1},${hb}) and (${b1},${ht}) .. (${lx},${ht});`);
    lines.push(`  \\draw[thick] (${lx},${ht}) .. controls (${b2},${ht}) and (${b2},${hb}) .. (${lx},${hb});`);

    // Dashed center line through lens
    lines.push(`  \\draw[dashed, gray!40] (${lx},${fmt(-h - 15)}) -- (${lx},${fmt(h + 15)});`);

    // Label above
    lines.push(`  \\node[above] at (${lx},${fmt(h + 18)}) {$L_{${num}}$};`);

    // Focal points
    const fAbs = Math.abs(f);
    lines.push(`  \\fill[orange] (${fmt(x - fAbs)},0) circle (1.5pt);`);
    lines.push(`  \\fill[orange] (${fmt(x + fAbs)},0) circle (1.5pt);`);
    lines.push(`  \\node[below, orange, font=\\footnotesize] at (${fmt(x - fAbs)},-0.12) {$F_{${num}}$};`);
    lines.push(`  \\node[below, orange, font=\\footnotesize] at (${fmt(x + fAbs)},-0.12) {$F'_{${num}}$};`);
    lines.push("");
  }

  // Objects
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    lines.push(`  % Object ${i + 1}`);
    lines.push(`  \\draw[thick, blue, ->, line width=1.5pt] (${fmt(obj.position)},0) -- (${fmt(obj.position)},${fmt(obj.height)});`);
    lines.push(`  \\node[above, blue, font=\\footnotesize] at (${fmt(obj.position)},${fmt(obj.height + 5)}) {$O_{${i + 1}}$};`);
    lines.push("");
  }

  // Rays — trace through each lens for each object
  for (const obj of objects) {
    if (sorted.length === 0) continue;
    let currentObjPos = obj.position;
    let currentObjHeight = obj.height;

    for (let i = 0; i < sorted.length; i++) {
      const lens = sorted[i];
      const f = getEffectiveFocalLength(lens);
      const { imagePos, imageHeight } = computeImageThroughLens(
        currentObjPos, currentObjHeight, lens.position, f
      );

      const rightBound = i === sorted.length - 1 ? maxX : sorted[i + 1].position;

      lines.push(`  % Rays: Object at ${currentObjPos.toFixed(0)} through lens ${i + 1}`);

      // Ray 1: Parallel to axis → through focal point
      lines.push(`  \\draw[red, ->, thin] (${fmt(currentObjPos)},${fmt(currentObjHeight)}) -- (${fmt(lens.position)},${fmt(currentObjHeight)});`);
      if (f > 0) {
        // Through far focal point and beyond
        const focalX = lens.position + f;
        const dx = focalX - lens.position;
        const dy = 0 - currentObjHeight;
        const extT = (rightBound - lens.position) / dx;
        const extY = currentObjHeight + dy * extT;
        lines.push(`  \\draw[red, ->, thin] (${fmt(lens.position)},${fmt(currentObjHeight)}) -- (${fmt(rightBound)},${fmt(extY)});`);
      } else {
        // Diverging: ray goes away from focal point
        const focalX = lens.position + f; // negative f, so to the left
        const dx = lens.position - focalX;
        const dy = currentObjHeight - 0;
        const extT = (rightBound - lens.position) / dx;
        const extY = currentObjHeight + dy * extT;
        lines.push(`  \\draw[red, ->, thin] (${fmt(lens.position)},${fmt(currentObjHeight)}) -- (${fmt(rightBound)},${fmt(extY)});`);
      }

      // Ray 2: Through optical center
      {
        const dx = lens.position - currentObjPos;
        const dy = 0 - currentObjHeight;
        if (Math.abs(dx) > 0.1) {
          const extT = (rightBound - currentObjPos) / dx;
          const extY = currentObjHeight + dy * extT;
          lines.push(`  \\draw[red, ->, thin] (${fmt(currentObjPos)},${fmt(currentObjHeight)}) -- (${fmt(rightBound)},${fmt(extY)});`);
        }
      }

      // Ray 3: Through near focal point → exits parallel
      {
        const nearFocalX = lens.position - f;
        const dx = nearFocalX - currentObjPos;
        const dy = 0 - currentObjHeight;
        if (Math.abs(dx) > 0.1) {
          const tLens = (lens.position - currentObjPos) / dx;
          const hitY = currentObjHeight + dy * tLens;
          lines.push(`  \\draw[red, thin] (${fmt(currentObjPos)},${fmt(currentObjHeight)}) -- (${fmt(lens.position)},${fmt(hitY)});`);
          lines.push(`  \\draw[red, ->, thin] (${fmt(lens.position)},${fmt(hitY)}) -- (${fmt(rightBound)},${fmt(hitY)});`);
        }
      }

      lines.push("");
      currentObjPos = imagePos;
      currentObjHeight = imageHeight;
    }
  }

  // Images
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!isFinite(img.position) || Math.abs(img.position) > 1500) continue;
    const style = img.isReal ? "" : "dashed, ";
    lines.push(`  % Image I_{${i + 1}}`);
    lines.push(`  \\draw[thick, red, ->, ${style}line width=1.2pt] (${fmt(img.position)},0) -- (${fmt(img.position)},${fmt(img.height)});`);
    lines.push(`  \\node[above, red, font=\\footnotesize] at (${fmt(img.position)},${fmt(Math.abs(img.height) + 5)}) {$I_{${i + 1}}$};`);
    lines.push("");
  }

  // Origin marker
  if (positionOrigin !== 0) {
    lines.push(`  % Origin marker`);
    lines.push(`  \\draw[thin, gray] (${fmt(positionOrigin)},-0.15) -- (${fmt(positionOrigin)},0.15);`);
    lines.push(`  \\node[below, gray, font=\\tiny] at (${fmt(positionOrigin)},-0.2) {origin};`);
  }

  lines.push("\\end{tikzpicture}");
  lines.push("\\end{document}");

  return lines.join("\n");
}
