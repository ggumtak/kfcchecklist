import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({
  className,
  error,
  hint,
  label,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        className={cn(
          "min-h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-ink/55">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({
  className,
  error,
  hint,
  label,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <textarea
        className={cn(
          "min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-ink/55">{hint}</span> : null}
    </label>
  );
}
