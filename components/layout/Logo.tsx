"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { app: "text-lg", aratus: "text-lg" },
  md: { app: "text-2xl", aratus: "text-2xl" },
  lg: { app: "text-5xl", aratus: "text-5xl" },
};

export default function Logo({ size = "md", className }: LogoProps) {
  const s = sizeMap[size];
  return (
    <span className={cn("inline-flex items-baseline gap-0", className)}>
      <span
        className={cn(
          s.app,
          "font-mono font-bold tracking-tight text-accent"
        )}
      >
        app
      </span>
      <span
        className={cn(
          s.aratus,
          "font-display italic tracking-wide text-foreground/80"
        )}
      >
        aratus
      </span>
    </span>
  );
}
