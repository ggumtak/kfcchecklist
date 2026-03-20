"use client";

import { useEffect } from "react";
import Link from "next/link";

import { useChecklist } from "@/features/checklist/context/checklist-provider";
import { Button } from "@/shared/components/button";
import { cn } from "@/shared/lib/cn";

interface AppShellProps {
  children: React.ReactNode;
  currentPath?: "home" | "settings" | "position";
}

export function AppShell({ children, currentPath = "home" }: AppShellProps) {
  const { isOnline, startNewShift } = useChecklist();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return (
    <div className="app-shell mx-auto w-full max-w-xl px-4 safe-top">
      {!isOnline ? (
        <div className="glass-panel mb-4 rounded-3xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-ink/80">
          오프라인 상태입니다. 저장된 데이터로 계속 사용할 수 있어요.
        </div>
      ) : null}
      {children}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl px-4 pb-3">
        <div className="glass-panel flex items-center justify-between gap-2 rounded-[1.7rem] px-3 py-3">
          <Link
            className={cn(
              "flex min-h-12 flex-1 items-center justify-center rounded-2xl text-sm font-semibold",
              currentPath === "home" ? "bg-ink text-white" : "text-ink/70",
            )}
            href="/"
          >
            홈
          </Link>
          <Button className="flex-1" onClick={startNewShift} variant="primary">
            새 근무 시작
          </Button>
          <Link
            className={cn(
              "flex min-h-12 flex-1 items-center justify-center rounded-2xl text-sm font-semibold",
              currentPath === "settings" ? "bg-ink text-white" : "text-ink/70",
            )}
            href="/settings"
          >
            설정
          </Link>
        </div>
      </nav>
    </div>
  );
}
