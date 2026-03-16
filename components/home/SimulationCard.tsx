"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Simulation } from "@/lib/simulations";

// Inline SVG icons for each simulation
function LensIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <ellipse
        cx="16"
        cy="16"
        rx="4"
        ry="12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="2"
        y1="16"
        x2="30"
        y2="16"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
      />
      <line
        x1="22"
        y1="10"
        x2="16"
        y2="16"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
      <line
        x1="16"
        y1="16"
        x2="28"
        y2="20"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        d="M2 16C2 16 6 6 10 6C14 6 14 26 18 26C22 26 22 6 26 6C28 6 30 12 30 16"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="14"
        y="2"
        width="4"
        height="28"
        fill="currentColor"
        opacity="0.1"
        rx="1"
      />
    </svg>
  );
}

function FeynmanIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <line
        x1="4"
        y1="8"
        x2="16"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="4"
        y1="24"
        x2="16"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16 16C18 14 20 18 22 16C24 14 26 18 28 16"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

const iconMap: Record<string, () => React.ReactElement> = {
  "lens-builder": LensIcon,
  "quantum-box": WaveIcon,
  "feynman-diagram": FeynmanIcon,
};

interface SimulationCardProps {
  simulation: Simulation;
  index: number;
}

export default function SimulationCard({
  simulation,
  index,
}: SimulationCardProps) {
  const Icon = iconMap[simulation.slug] ?? LensIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
    >
      <Link
        href={`/simulations/${simulation.type}/${simulation.slug}`}
        className="group block rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:border-border-hover hover:bg-surface-hover"
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="text-text-muted transition-colors group-hover:text-accent">
            <Icon />
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              simulation.tagColor
            )}
          >
            {simulation.tag}
          </span>
        </div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          {simulation.name}
        </h3>
        <p className="text-xs leading-relaxed text-text-muted">
          {simulation.description}
        </p>
      </Link>
    </motion.div>
  );
}
