import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/shared/lib/cn";

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("glass-panel rounded-[1.75rem] p-4", className)} {...props}>
      {children}
    </div>
  );
}
