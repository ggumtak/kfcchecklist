import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/shared/lib/cn";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active, children, className, type = "button", ...props }: PropsWithChildren<ChipProps>) {
  return (
    <button
      className={cn(
        "min-h-11 rounded-2xl px-4 text-sm font-medium transition",
        active ? "bg-ink text-white" : "bg-white/75 text-ink ring-1 ring-ink/10",
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
