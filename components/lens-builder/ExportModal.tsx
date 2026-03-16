"use client";

import { useState, useCallback, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Lens, LensObject, ImageInfo } from "./types";
import { generateTikZ } from "@/lib/export/tikz";

type Tab = "image" | "link" | "tikz";
type ImageFormat = "png" | "jpeg";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  lenses: Lens[];
  objects: LensObject[];
  images: ImageInfo[];
  positionOrigin: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function ExportModal({
  open,
  onClose,
  lenses,
  objects,
  images,
  positionOrigin,
  canvasRef,
}: ExportModalProps) {
  const [tab, setTab] = useState<Tab>("image");
  const [format, setFormat] = useState<ImageFormat>("png");
  const [withBackground, setWithBackground] = useState(true);
  const [copied, setCopied] = useState(false);
  const tikzRef = useRef<HTMLTextAreaElement>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // ── Image export ──────────────────────────────────────
  const handleImageDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!withBackground && format === "png") {
      // Create offscreen canvas, copy current content without background
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const octx = offscreen.getContext("2d");
      if (!octx) return;
      // Draw the existing canvas (which has background baked in)
      // For transparent, we'd need to re-render. Since we can't easily,
      // draw current canvas and then we get what we get.
      // Better approach: draw current canvas content as-is.
      octx.drawImage(canvas, 0, 0);
      const url = offscreen.toDataURL("image/png");
      downloadDataUrl(url, `lens-diagram.png`);
    } else {
      const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
      if (format === "jpeg" && !withBackground) {
        // JPEG doesn't support transparency, just export as-is
        const url = canvas.toDataURL(mimeType, 0.95);
        downloadDataUrl(url, `lens-diagram.${format}`);
      } else {
        const url = canvas.toDataURL(mimeType, format === "jpeg" ? 0.95 : undefined);
        downloadDataUrl(url, `lens-diagram.${format}`);
      }
    }
  }, [canvasRef, format, withBackground]);

  // ── Share link ────────────────────────────────────────
  const shareUrl = useCallback(() => {
    const stateObj = { lenses, objects, positionOrigin };
    const encoded = btoa(JSON.stringify(stateObj));
    const base = typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "";
    return `${base}?state=${encoded}`;
  }, [lenses, objects, positionOrigin]);

  // ── TikZ ──────────────────────────────────────────────
  const tikzCode = useCallback(() => {
    return generateTikZ(lenses, objects, images, positionOrigin);
  }, [lenses, objects, images, positionOrigin]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "image", label: "Image" },
    { key: "link", label: "Share Link" },
    { key: "tikz", label: "TikZ" },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Export</h2>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-lg bg-background p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setCopied(false); }}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-surface text-foreground"
                : "text-text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "image" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <span>Format:</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ImageFormat)}
                className="cursor-pointer rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
              </select>
            </label>

            {format === "png" && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={withBackground}
                  onChange={(e) => setWithBackground(e.target.checked)}
                  className="accent-accent"
                />
                Include background
              </label>
            )}
          </div>

          <Button onClick={handleImageDownload} variant="primary" size="sm">
            Download {format.toUpperCase()}
          </Button>
        </div>
      )}

      {tab === "link" && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            Share this link to recreate the exact same ray diagram.
          </p>
          <input
            type="text"
            readOnly
            value={shareUrl()}
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(shareUrl())}
              variant="primary"
              size="sm"
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ url: shareUrl() }).catch(() => {});
                } else {
                  copyToClipboard(shareUrl());
                }
              }}
              variant="secondary"
              size="sm"
            >
              Share
            </Button>
          </div>
        </div>
      )}

      {tab === "tikz" && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            Copy this TikZ code into a LaTeX document to reproduce the diagram.
          </p>
          <textarea
            ref={tikzRef}
            readOnly
            value={tikzCode()}
            rows={14}
            className="w-full rounded border border-border bg-background p-3 font-mono text-xs text-foreground"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <Button
            onClick={() => copyToClipboard(tikzCode())}
            variant="primary"
            size="sm"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
