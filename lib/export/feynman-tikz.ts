import type { Vertex, Propagator, TextElement, LineType } from "@/components/feynman-diagram/types";

function tikzLineStyle(lineType: LineType): string {
  switch (lineType) {
    case "fermion": return "fermion";
    case "antifermion": return "anti fermion";
    case "photon": return "photon";
    case "gluon": return "gluon";
    case "w-boson": return "boson";
    case "z-boson": return "boson";
    case "higgs": return "scalar";
    case "ghost": return "ghost";
  }
}

export function generateFeynmanTikZ(
  vertices: Vertex[],
  propagators: Propagator[],
  textElements: TextElement[]
): string {
  const lines: string[] = [];

  lines.push("\\documentclass[border=10pt]{standalone}");
  lines.push("\\usepackage{tikz-feynman}");
  lines.push("\\tikzfeynmanset{compat=1.1.0}");
  lines.push("");
  lines.push("\\begin{document}");
  lines.push("\\begin{tikzpicture}");
  lines.push("  \\begin{feynman}");

  // Scale: grid units → cm
  const scale = 0.8;

  // Vertices
  for (const v of vertices) {
    const x = (v.gx * scale).toFixed(2);
    const y = (-v.gy * scale).toFixed(2); // flip y for TikZ
    if (v.label) {
      lines.push(`    \\vertex (${v.id}) at (${x}, ${y}) {${v.label}};`);
    } else {
      lines.push(`    \\vertex (${v.id}) at (${x}, ${y});`);
    }
  }

  lines.push("");
  lines.push("    \\diagram* {");

  // Propagators
  for (const p of propagators) {
    const style = tikzLineStyle(p.lineType);
    const label = p.label ? `, edge label=${p.label}` : "";
    lines.push(`      (${p.from}) -- [${style}${label}] (${p.to}),`);
  }

  lines.push("    };");

  // Text elements
  for (const te of textElements) {
    const x = (te.gx * scale).toFixed(2);
    const y = (-te.gy * scale).toFixed(2);
    const text = te.isLatex ? `$${te.text}$` : te.text;
    lines.push(`    \\node at (${x}, ${y}) {${text}};`);
  }

  lines.push("  \\end{feynman}");
  lines.push("\\end{tikzpicture}");
  lines.push("\\end{document}");

  return lines.join("\n");
}
