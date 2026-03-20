"use client";

import Link from "next/link";

import { AppShell } from "@/features/checklist/components/app-shell";
import { InstallPromptButton } from "@/features/checklist/components/install-prompt-button";
import { useChecklist } from "@/features/checklist/context/checklist-provider";
import { getActiveSession } from "@/features/checklist/lib/reset";
import { getPendingTaskCount, getPositions, getProgressForPosition, getSummaryCounts } from "@/features/checklist/lib/selectors";
import { Button } from "@/shared/components/button";
import { Card } from "@/shared/components/card";
import { ProgressBar } from "@/shared/components/progress-bar";

export function HomeScreen() {
  const { data, resetToday, startNewShift, status } = useChecklist();

  if (status === "loading") {
    return (
      <AppShell currentPath="home">
        <div className="space-y-4 py-8">
          <Card className="h-40 animate-pulse bg-white/60" />
          <Card className="h-28 animate-pulse bg-white/60" />
          <Card className="h-28 animate-pulse bg-white/60" />
        </div>
      </AppShell>
    );
  }

  const positions = getPositions(data);
  const summary = getSummaryCounts(data);
  const session = getActiveSession(data);

  return (
    <AppShell currentPath="home">
      <main className="space-y-4 pb-32">
        <section className="glass-panel rounded-[2rem] px-5 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink/60">오늘 근무 체크리스트</p>
              <h1 className="mt-2 text-[1.75rem] font-bold leading-tight">빠르게 체크하고 바로 넘어가세요</h1>
            </div>
            <div className="rounded-3xl bg-accent/10 px-3 py-2 text-right">
              <p className="text-xs font-medium text-ink/55">현재 세션</p>
              <p className="mt-1 text-sm font-semibold text-accent">{session?.label ?? "근무 준비 중"}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCard label="포지션" value={`${summary.positions}`} />
            <StatCard label="업무 수" value={`${summary.tasks}`} />
            <StatCard label="완료" value={`${summary.completedTasks}`} />
          </div>
          <div className="mt-5 grid gap-3">
            <Button fullWidth onClick={startNewShift}>
              새 근무 시작
            </Button>
            <Button fullWidth onClick={resetToday} variant="ghost">
              오늘 체크 초기화
            </Button>
            <InstallPromptButton />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold">포지션 선택</h2>
            <Link className="text-sm font-semibold text-accent" href="/settings">
              구조 관리
            </Link>
          </div>
          {positions.map((position) => {
            const progress = getProgressForPosition(data, position.id);
            const pendingCount = getPendingTaskCount(data, position.id);

            return (
              <Link href={`/positions/${position.id}`} key={position.id}>
                <Card className="space-y-4 px-5 py-5 active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/45">Position</p>
                      <h3 className="mt-1 text-xl font-semibold">{position.name}</h3>
                    </div>
                    <div className="rounded-3xl bg-mint/10 px-3 py-2 text-right text-sm font-semibold text-mint">
                      {progress.percent}%
                    </div>
                  </div>
                  <ProgressBar value={progress.percent} />
                  <div className="flex items-center justify-between text-sm text-ink/60">
                    <span>
                      {progress.completed}/{progress.total} 완료
                    </span>
                    <span>{pendingCount}개 남음</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </section>
      </main>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/80 px-3 py-4 text-center">
      <p className="text-xs font-medium text-ink/50">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
