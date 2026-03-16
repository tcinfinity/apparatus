"use client";

import Link from "next/link";
import Logo from "./Logo";
import { cn } from "@/lib/utils";

interface SimulationNavProps {
  title: string;
  className?: string;
}

export default function SimulationNav({
  title,
  className,
}: SimulationNavProps) {
  return (
    <nav
      className={cn(
        "sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-md",
        className
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-2 text-text-muted transition-colors hover:text-foreground"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M12.5 15L7.5 10L12.5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <Logo size="sm" />
      </Link>
      <div className="h-5 w-px bg-border" />
      <span className="text-sm font-medium text-foreground">{title}</span>
    </nav>
  );
}
