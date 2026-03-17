"use client";

import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search simulations...",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <circle
          cx="7"
          cy="7"
          r="5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M11 11L14 14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-4 text-sm text-foreground placeholder:text-text-muted transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
      />
    </div>
  );
}
