import { cn } from "@/shared/lib/cn";

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div className={cn("h-2.5 rounded-full bg-ink/8", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent via-[#df8a46] to-mint transition-[width]"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
