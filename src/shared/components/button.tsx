"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white shadow-sm active:scale-[0.99]",
  secondary: "bg-ink text-white shadow-sm active:scale-[0.99]",
  ghost: "bg-white/80 text-ink ring-1 ring-ink/10 active:bg-white",
  danger: "bg-danger text-white shadow-sm active:scale-[0.99]",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-12 px-4 text-sm font-semibold",
  sm: "min-h-10 px-3 text-sm font-medium",
  icon: "h-11 w-11 justify-center rounded-2xl p-0 text-base",
};

export function Button({
  children,
  className,
  fullWidth,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "tap-highlight-none inline-flex items-center justify-center gap-2 rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
