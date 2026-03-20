"use client";

import Link from "next/link";
import { useState } from "react";

import { AppShell } from "@/features/checklist/components/app-shell";
import { PhaseFormSheet } from "@/features/checklist/components/forms/phase-form-sheet";
import { TaskFormSheet } from "@/features/checklist/components/forms/task-form-sheet";
import { useChecklist } from "@/features/checklist/context/checklist-provider";
import { filterTasks, findPosition, getPhasesForPosition, getProgressForPhase, getProgressForPosition, getTasksForPhase } from "@/features/checklist/lib/selectors";
import type { Phase, Task, TaskFilter } from "@/features/checklist/lib/types";
import { Button } from "@/shared/components/button";
import { Card } from "@/shared/components/card";
import { Chip } from "@/shared/components/chip";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ProgressBar } from "@/shared/components/progress-bar";
import { cn } from "@/shared/lib/cn";

interface PositionScreenProps {
  positionId: string;
}

type PhaseSheetState =
  | { mode: "create" }
  | { mode: "edit"; phase: Phase }
  | null;

type TaskSheetState =
  | { mode: "create"; phaseId: string }
  | { mode: "edit"; task: Task }
  | null;

type DeleteTarget =
  | { type: "phase"; id: string; title: string }
  | { type: "task"; id: string; title: string }
  | null;

type VisibleTask = ReturnType<typeof filterTasks>[number];

export function PositionScreen({ positionId }: PositionScreenProps) {
  const {
    data,
    deletePhase,
    deleteTask,
    duplicateTask,
    moveTask,
    savePhase,
    saveTask,
    status,
    togglePhaseTasks,
    toggleTask,
  } = useChecklist();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(null);
  const [phaseSheet, setPhaseSheet] = useState<PhaseSheetState>(null);
  const [taskSheet, setTaskSheet] = useState<TaskSheetState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const position = findPosition(data, positionId);
  const phases = getPhasesForPosition(data, positionId);
  const progress = getProgressForPosition(data, positionId);
  const allFilteredTasksCount = phases.reduce(
    (count, phase) => count + filterTasks(getTasksForPhase(data, phase.id), data, query, filter).length,
    0,
  );

  if (status === "loading") {
    return (
      <AppShell currentPath="position">
        <div className="space-y-4 py-8">
          <Card className="h-32 animate-pulse bg-white/60" />
          <Card className="h-56 animate-pulse bg-white/60" />
        </div>
      </AppShell>
    );
  }

  if (!position) {
    return (
      <AppShell currentPath="position">
        <main className="space-y-4 pb-32">
          <Card>
            <p className="text-lg font-semibold">포지션을 찾을 수 없습니다.</p>
            <Link className="mt-3 inline-block text-sm font-semibold text-accent" href="/">
              홈으로 돌아가기
            </Link>
          </Card>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell currentPath="position">
      <main className="space-y-4 pb-32">
        <section className="glass-panel rounded-[2rem] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link className="text-sm font-medium text-ink/55" href="/">
                ← 포지션 목록
              </Link>
              <h1 className="mt-2 text-2xl font-bold">{position.name}</h1>
              <p className="mt-1 text-sm text-ink/60">
                {progress.completed}개 완료 / {progress.total}개 업무
              </p>
            </div>
            <Button onClick={() => setPhaseSheet({ mode: "create" })} size="sm" variant="secondary">
              단계 추가
            </Button>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress.percent} />
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hidden">
            {phases.map((phase) => {
              const phaseProgress = getProgressForPhase(data, phase.id);

              return (
                <a
                  className="min-w-fit rounded-2xl bg-white/85 px-4 py-3 text-sm font-medium text-ink/75 ring-1 ring-ink/8"
                  href={`#phase-${phase.id}`}
                  key={phase.id}
                >
                  {phase.name} {phaseProgress.percent}%
                </a>
              );
            })}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] px-4 py-4">
          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/65">업무 검색</span>
              <input
                className="min-h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="업무 이름으로 찾기"
                value={query}
              />
            </label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hidden">
              <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                전체
              </Chip>
              <Chip active={filter === "pending"} onClick={() => setFilter("pending")}>
                미완료만
              </Chip>
              <Chip active={filter === "timed"} onClick={() => setFilter("timed")}>
                시간 있는 항목만
              </Chip>
            </div>
            <p className="text-xs text-ink/55">현재 조건에 맞는 업무 {allFilteredTasksCount}개</p>
          </div>
        </section>

        {phases.length === 0 ? (
          <EmptyState description="단계를 추가하면 바로 체크리스트를 사용할 수 있어요." title="아직 단계가 없습니다." />
        ) : (
          phases.map((phase) => {
            const phaseTasks = getTasksForPhase(data, phase.id);
            const visibleTasks = filterTasks(phaseTasks, data, query, filter);
            const phaseProgress = getProgressForPhase(data, phase.id);
            const isExpanded = openPhaseId === null || openPhaseId === phase.id;

            return (
              <Card className="space-y-4 px-4 py-4" id={`phase-${phase.id}`} key={phase.id}>
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="flex-1 text-left"
                    onClick={() => setOpenPhaseId(openPhaseId === phase.id ? null : phase.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-2xl bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                        {phaseProgress.percent}%
                      </span>
                      <h2 className="text-lg font-semibold">{phase.name}</h2>
                    </div>
                    <p className="mt-2 text-sm text-ink/60">
                      {phaseProgress.completed}/{phaseProgress.total} 완료
                    </p>
                  </button>
                  <div className="flex gap-2">
                    <Button onClick={() => setPhaseSheet({ mode: "edit", phase })} size="sm" variant="ghost">
                      수정
                    </Button>
                    <Button
                      onClick={() => setDeleteTarget({ type: "phase", id: phase.id, title: phase.name })}
                      size="sm"
                      variant="danger"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
                <ProgressBar value={phaseProgress.percent} />
                <div className="grid grid-cols-2 gap-2">
                  <Button fullWidth onClick={() => togglePhaseTasks(phase.id, true)} size="sm" variant="ghost">
                    단계 전체 완료
                  </Button>
                  <Button fullWidth onClick={() => togglePhaseTasks(phase.id, false)} size="sm" variant="ghost">
                    단계 전체 해제
                  </Button>
                  <Button fullWidth onClick={() => setTaskSheet({ mode: "create", phaseId: phase.id })} size="sm">
                    업무 추가
                  </Button>
                </div>
                {isExpanded ? (
                  visibleTasks.length === 0 ? (
                    <div className="rounded-3xl bg-white/70 px-4 py-4 text-sm text-ink/55">
                      현재 필터 조건에 맞는 업무가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          onDelete={() => setDeleteTarget({ type: "task", id: task.id, title: task.title })}
                          onDuplicate={() => duplicateTask(task.id)}
                          onEdit={() => setTaskSheet({ mode: "edit", task })}
                          onMoveDown={() => moveTask(task.id, "down")}
                          onMoveUp={() => moveTask(task.id, "up")}
                          onToggle={() => toggleTask(task.id)}
                          task={task}
                        />
                      ))}
                    </div>
                  )
                ) : null}
              </Card>
            );
          })
        )}
      </main>

      <PhaseFormSheet
        defaultPositionId={position.id}
        onClose={() => setPhaseSheet(null)}
        onSubmit={(input) => savePhase(input, phaseSheet?.mode === "edit" ? phaseSheet.phase.id : undefined)}
        open={phaseSheet !== null}
        phase={phaseSheet?.mode === "edit" ? phaseSheet.phase : undefined}
        positions={[position]}
      />

      <TaskFormSheet
        defaultPhaseId={taskSheet?.mode === "create" ? taskSheet.phaseId : undefined}
        onClose={() => setTaskSheet(null)}
        onSubmit={(input) => saveTask(input, taskSheet?.mode === "edit" ? taskSheet.task.id : undefined)}
        open={taskSheet !== null}
        phases={phases}
        task={taskSheet?.mode === "edit" ? taskSheet.task : undefined}
      />

      <ConfirmDialog
        confirmLabel="삭제하기"
        description={`${deleteTarget?.title ?? ""} 항목을 삭제하면 관련 데이터도 함께 지워집니다.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          if (deleteTarget.type === "phase") {
            deletePhase(deleteTarget.id);
          } else {
            deleteTask(deleteTarget.id);
          }

          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        title={`${deleteTarget?.title ?? ""} 삭제`}
      />
    </AppShell>
  );
}

interface TaskRowProps {
  task: VisibleTask;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function TaskRow({ onDelete, onDuplicate, onEdit, onMoveDown, onMoveUp, onToggle, task }: TaskRowProps) {
  return (
    <article
      className={cn(
        "rounded-[1.5rem] border px-4 py-4 transition",
        task.completed ? "border-mint/20 bg-mint/10" : "border-ink/8 bg-white/90",
        task.overdue && !task.completed && "border-danger/30 bg-danger/10",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label={task.completed ? "업무 완료 해제" : "업무 완료"}
          className={cn(
            "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg font-bold",
            task.completed ? "border-mint bg-mint text-white" : "border-ink/15 bg-white text-ink/45",
          )}
          onClick={onToggle}
        >
          {task.completed ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("text-sm font-semibold leading-6", task.completed && "text-ink/45 line-through")}>
              {task.title}
            </h3>
            {task.timeLabel ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  task.overdue && !task.completed ? "bg-danger text-white" : "bg-accent/10 text-accent",
                )}
              >
                {task.timeLabel}
              </span>
            ) : null}
          </div>
          {task.memo ? <p className="mt-1 text-sm text-ink/65">{task.memo}</p> : null}
          {task.notes ? <p className="mt-2 rounded-2xl bg-ink/5 px-3 py-2 text-xs text-ink/60">{task.notes}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={onEdit} size="sm" variant="ghost">
              수정
            </Button>
            <Button onClick={onDuplicate} size="sm" variant="ghost">
              복제
            </Button>
            <Button onClick={onMoveUp} size="sm" variant="ghost">
              ↑
            </Button>
            <Button onClick={onMoveDown} size="sm" variant="ghost">
              ↓
            </Button>
            <Button onClick={onDelete} size="sm" variant="danger">
              삭제
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
