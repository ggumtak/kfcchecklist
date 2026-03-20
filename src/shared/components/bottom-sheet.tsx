"use client";

import { useEffect } from "react";
import type { PropsWithChildren } from "react";

import { cn } from "@/shared/lib/cn";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  className?: string;
}

export function BottomSheet({
  children,
  className,
  description,
  onClose,
  open,
  title,
}: PropsWithChildren<BottomSheetProps>) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="시트 닫기"
        className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
        onClick={onClose}
      />
      <section
        aria-describedby={description ? "sheet-description" : undefined}
        aria-labelledby="sheet-title"
        aria-modal="true"
        className={cn(
          "safe-bottom relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[rgba(255,252,247,0.98)] px-4 pb-6 pt-4 shadow-panel",
          className,
        )}
        role="dialog"
      >
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-ink/10" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="sheet-title">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-ink/60" id="sheet-description">
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="닫기"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink/5 text-lg text-ink/70"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
