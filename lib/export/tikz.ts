import type { Lens, LensObject, ImageInfo } from "@/components/lens-builder/types";
import { getEffectiveFocalLength } from "@/lib/physics/optics";

const SCALE = 0.02; // sim units → cm (500 units → 10cm)

function fmt(v: number): string {
  return (v * SCALE).toFixed(2);
}

export function generateTikZ(
  lenses: Lens[],
  objects: LensObject[],
  images: ImageInfo[],
  positionOrigin: number
): string {
  const sorted = [...lenses].sort((a, b) => a.position - b.position);
  const lines: string[] = [];

  lines.push("\\documentclass[border=5pt]{standalone}");
  lines.push("\\usepackage{tikz}");
  lines.push("\\begin{document}");
  lines.push("\\begin{tikzpicture}[>=stealth]");
  lines.push("");

  // Determine axis range
  const allX = [
    ...lenses.map(l => l.position),
    ...objects.map(o => o.position),
    ...images.filter(i => isFinite(i.position) && Math.abs(i.position) < 2000).map(i => i.position),
  ];
  const minX = Math.min(-300, ...allX) - 50;
  const maxX = Math.max(300, ...allX) + 50;

  // Optical axis
  lines.push(`  % Optical axis`);
  lines.push(`  \\draw[dashed, gray!50] (${fmt(minX)},0) -- (${fmt(maxX)},0);`);
  lines.push("");

  // Lenses
  for (let i = 0; i < sorted.length; i++) {
    const lens = sorted[i];
    const f = getEffectiveFocalLength(lens);
    const x = lens.position;
    const h = lens.height * 0.5; // half-height for drawing
    const isConverging = lens.type === "biconvex" || lens.type === "plano-convex";
    const num = i + 1;

    lines.push(`  % Lens L_${num} (${lens.type})`);
    if (isConverging) {
      // Converging lens: double arrow
      lines.push(`  \\draw[thick, violet] (${fmt(x)},${fmt(-h)}) -- (${fmt(x)},${fmt(h)});`);
      lines.push(`  \\draw[thick, violet, ->] (${fmt(x)},${fmt(h * 0.85)}) -- (${fmt(x)},${fmt(h)});`);
      lines.push(`  \\draw[thick, violet, ->] (${fmt(x)},${fmt(-h * 0.85)}) -- (${fmt(x)},${fmt(-h)});`);
    } else {
      // Diverging lens: inward arrows
      lines.push(`  \\draw[thick, violet] (${fmt(x)},${fmt(-h)}) -- (${fmt(x)},${fmt(h)});`);
      lines.push(`  \\draw[thick, violet, <-] (${fmt(x)},${fmt(h * 0.85)}) -- (${fmt(x)},${fmt(h)});`);
      lines.push(`  \\draw[thick, violet, <-] (${fmt(x)},${fmt(-h * 0.85)}) -- (${fmt(x)},${fmt(-h)});`);
    }

    // Label
    lines.push(`  \\node[above, violet] at (${fmt(x)},${fmt(h + 10)}) {$L_{${num}}$};`);

    // Focal points
    const fAbs = Math.abs(f);
    lines.push(`  \\fill[orange] (${fmt(x - fAbs)},0) circle (1.5pt);`);
    lines.push(`  \\fill[orange] (${fmt(x + fAbs)},0) circle (1.5pt);`);
    lines.push(`  \\node[below, orange, font=\\footnotesize] at (${fmt(x - fAbs)},-0.1) {$F_{${num}}$};`);
    lines.push(`  \\node[below, orange, font=\\footnotesize] at (${fmt(x + fAbs)},-0.1) {$F'_{${num}}$};`);
    lines.push("");
  }

  // Objects
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    lines.push(`  % Object ${i + 1}`);
    lines.push(`  \\draw[thick, blue, ->, line width=1.5pt] (${fmt(obj.position)},0) -- (${fmt(obj.position)},${fmt(obj.height)});`);
    lines.push(`  \\node[above, blue, font=\\footnotesize] at (${fmt(obj.position)},${fmt(obj.height + 5)}) {O$_{${i + 1}}$};`);
    lines.push("");
  }

  // Images
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!isFinite(img.position) || Math.abs(img.position) > 1500) continue;
    const style = img.isReal ? "solid" : "dashed";
    lines.push(`  % Image I_${i + 1}`);
    lines.push(`  \\draw[thick, red, ->, ${style}, line width=1.2pt] (${fmt(img.position)},0) -- (${fmt(img.position)},${fmt(img.height)});`);
    lines.push(`  \\node[above, red, font=\\footnotesize] at (${fmt(img.position)},${fmt(Math.abs(img.height) + 5)}) {$I_{${i + 1}}$};`);
    lines.push("");
  }

  // Position labels on axis
  if (positionOrigin !== 0) {
    lines.push(`  % Origin marker`);
    lines.push(`  \\draw[thin, gray] (${fmt(positionOrigin)},-0.15) -- (${fmt(positionOrigin)},0.15);`);
    lines.push(`  \\node[below, gray, font=\\tiny] at (${fmt(positionOrigin)},-0.2) {origin};`);
  }

  lines.push("\\end{tikzpicture}");
  lines.push("\\end{document}");

  return lines.join("\n");
}
