"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-accent text-white hover:bg-accent-hover active:scale-[0.98]":
              variant === "primary",
            "border border-border bg-surface text-foreground hover:border-border-hover hover:bg-surface-hover":
              variant === "secondary",
            "text-text-muted hover:bg-surface hover:text-foreground":
              variant === "ghost",
          },
          {
            "h-8 gap-1.5 px-3 text-xs": size === "sm",
            "h-9 gap-2 px-4 text-sm": size === "md",
            "h-10 gap-2 px-5 text-sm": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export default Button;
