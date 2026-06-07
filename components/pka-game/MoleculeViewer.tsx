"use client";

import { useEffect, useRef } from "react";

interface Props {
  smiles: string;
  width?: number;
  height?: number;
  className?: string;
}

// smiles-drawer is loaded as a script tag from /public/libs/smiles-drawer.js
// which sets window.SmilesDrawer (SmilesDrawerNS) and window.SmiDrawer.
// SvgDrawer.draw(data, target, theme, weights, infoOnly, highlight_atoms)
// highlight_atoms is an array of [atomClass, colorString] pairs.
// We use [H:1] in SMILES (class 1) so the acidic H gets highlighted.

declare global {
  interface Window {
    SmilesDrawer?: {
      SvgDrawer: new (opts: Record<string, unknown>) => {
        draw: (
          tree: unknown,
          target: SVGSVGElement | null,
          theme: string,
          weights: null,
          infoOnly: boolean,
          highlightAtoms: [number, string][],
        ) => SVGSVGElement;
      };
      parse: (
        smiles: string,
        onSuccess: (tree: unknown) => void,
        onError?: (err: unknown) => void,
      ) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadSmilesDrawer(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (typeof window === "undefined") return Promise.resolve();

  if (window.SmilesDrawer) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-smiles-drawer]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "/libs/smiles-drawer.js";
    script.dataset.smilesDrawer = "1";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function MoleculeViewer({ smiles, width = 300, height = 200, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;

    loadSmilesDrawer().then(() => {
      if (cancelled || !window.SmilesDrawer) return;

      const theme =
        document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

      const drawer = new window.SmilesDrawer.SvgDrawer({ width, height });

      window.SmilesDrawer.parse(
        smiles,
        (tree) => {
          if (cancelled) return;
          const svg = drawer.draw(tree, null, theme, null, false, [[1, "#ef4444"]]);

          // Make responsive
          svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
          svg.setAttribute("width", "100%");
          svg.setAttribute("height", "100%");
          svg.style.maxWidth = `${width}px`;

          container.innerHTML = "";
          container.appendChild(svg);
        },
        () => {
          if (!cancelled) {
            container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:${height}px;font-size:12px;color:var(--text-muted)">Cannot render structure</div>`;
          }
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [smiles, width, height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", maxWidth: width, height }}
    />
  );
}
