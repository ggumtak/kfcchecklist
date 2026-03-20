"use client";

import { useRef, useState } from "react";

import { AppShell } from "@/features/checklist/components/app-shell";
import { PhaseFormSheet } from "@/features/checklist/components/forms/phase-form-sheet";
import { PositionFormSheet } from "@/features/checklist/components/forms/position-form-sheet";
import { TaskFormSheet } from "@/features/checklist/components/forms/task-form-sheet";
import { useChecklist } from "@/features/checklist/context/checklist-provider";
import { createExportPayload } from "@/features/checklist/lib/import-export";
import { getPhasesForPosition, getPositions, getTasksForPhase } from "@/features/checklist/lib/selectors";
import type { Phase, Position, Task } from "@/features/checklist/lib/types";
import { Button } from "@/shared/components/button";
import { Card } from "@/shared/components/card";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { downloadTextFile } from "@/shared/lib/download";

type PositionSheetState =
  | { mode: "create" }
  | { mode: "edit"; position: Position }
  | null;

type PhaseSheetState =
  | { mode: "create"; positionId: string }
  | { mode: "edit"; phase: Phase }
  | null;

type TaskSheetState =
  | { mode: "create"; phaseId: string }
  | { mode: "edit"; task: Task }
  | null;

type DeleteTarget =
  | { type: "position"; id: string; title: string }
  | { type: "phase"; id: string; title: string }
  | { type: "task"; id: string; title: string }
  | { type: "reset"; id: "__seed_reset__"; title: string }
  | null;

export function SettingsScreen() {
  const {
    data,
    deletePhase,
    deletePosition,
    deleteTask,
    importData,
    movePhase,
    movePosition,
    moveTask,
    resetToSeed,
    resetToday,
    savePhase,
    savePosition,
    saveTask,
    startNewShift,
    status,
  } = useChecklist();
  const [positionSheet, setPositionSheet] = useState<PositionSheetState>(null);
  const [phaseSheet, setPhaseSheet] = useState<PhaseSheetState>(null);
  const [taskSheet, setTaskSheet] = useState<TaskSheetState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status === "loading") {
    return (
      <AppShell currentPath="settings">
        <div className="space-y-4 py-8">
          <Card className="h-32 animate-pulse bg-white/60" />
          <Card className="h-96 animate-pulse bg-white/60" />
        </div>
      </AppShell>
    );
  }

  const positions = getPositions(data);

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      importData(text);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "백업 파일을 불러오지 못했습니다.");
    }
  }

  return (
    <AppShell currentPath="settings">
      <main className="space-y-4 pb-32">
        <section className="glass-panel rounded-[2rem] px-5 py-5">
          <p className="text-sm font-medium text-ink/55">설정 및 백업</p>
          <h1 className="mt-2 text-2xl font-bold">구조 관리</h1>
          <p className="mt-2 text-sm text-ink/60">
            포지션, 단계, 업무를 앱 안에서 바로 수정하고 백업 파일로 보관할 수 있습니다.
          </p>
          <div className="mt-4 grid gap-2">
            <Button
              fullWidth
              onClick={() =>
                downloadTextFile(
                  `kfc-checklist-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(createExportPayload(data), null, 2),
                )
              }
              variant="secondary"
            >
              JSON 백업 내보내기
            </Button>
            <Button fullWidth onClick={() => fileInputRef.current?.click()} variant="ghost">
              JSON 복원 불러오기
            </Button>
            <Button fullWidth onClick={startNewShift} variant="ghost">
              새 근무 시작
            </Button>
            <Button fullWidth onClick={resetToday} variant="ghost">
              오늘 체크 초기화
            </Button>
            <Button
              fullWidth
              onClick={() => setDeleteTarget({ type: "reset", id: "__seed_reset__", title: "초기 데이터 리셋" })}
              variant="danger"
            >
              초기 데이터로 리셋
            </Button>
          </div>
          {importError ? <p className="mt-3 text-sm text-danger">{importError}</p> : null}
          <input
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void handleImportFile(file);
              }

              event.currentTarget.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold">포지션 / 단계 / 업무 편집</h2>
            <Button onClick={() => setPositionSheet({ mode: "create" })} size="sm">
              포지션 추가
            </Button>
          </div>
          {positions.map((position) => {
            const phases = getPhasesForPosition(data, position.id);

            return (
              <Card className="space-y-4" key={position.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{position.name}</p>
                    <p className="text-sm text-ink/55">{phases.length}개 단계</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={() => movePosition(position.id, "up")} size="sm" variant="ghost">
                      ↑
                    </Button>
                    <Button onClick={() => movePosition(position.id, "down")} size="sm" variant="ghost">
                      ↓
                    </Button>
                    <Button onClick={() => setPositionSheet({ mode: "edit", position })} size="sm" variant="ghost">
                      수정
                    </Button>
                    <Button
                      onClick={() => setDeleteTarget({ type: "position", id: position.id, title: position.name })}
                      size="sm"
                      variant="danger"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Button onClick={() => setPhaseSheet({ mode: "create", positionId: position.id })} size="sm">
                    단계 추가
                  </Button>
                  {phases.map((phase) => {
                    const tasks = getTasksForPhase(data, phase.id);

                    return (
                      <div className="rounded-[1.5rem] border border-ink/10 bg-white/75 p-4" key={phase.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{phase.name}</p>
                            <p className="text-sm text-ink/55">{tasks.length}개 업무</p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button onClick={() => movePhase(phase.id, "up")} size="sm" variant="ghost">
                              ↑
                            </Button>
                            <Button onClick={() => movePhase(phase.id, "down")} size="sm" variant="ghost">
                              ↓
                            </Button>
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
                        <div className="mt-3 space-y-3">
                          <Button onClick={() => setTaskSheet({ mode: "create", phaseId: phase.id })} size="sm">
                            업무 추가
                          </Button>
                          {tasks.map((task) => (
                            <div className="rounded-3xl bg-sand px-4 py-3" key={task.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold leading-6">{task.title}</p>
                                  <p className="text-xs text-ink/50">
                                    {task.dueTime ? `시간 ${task.dueTime}` : "시간 지정 없음"}
                                  </p>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button onClick={() => moveTask(task.id, "up")} size="sm" variant="ghost">
                                    ↑
                                  </Button>
                                  <Button onClick={() => moveTask(task.id, "down")} size="sm" variant="ghost">
                                    ↓
                                  </Button>
                                  <Button onClick={() => setTaskSheet({ mode: "edit", task })} size="sm" variant="ghost">
                                    수정
                                  </Button>
                                  <Button
                                    onClick={() => setDeleteTarget({ type: "task", id: task.id, title: task.title })}
                                    size="sm"
                                    variant="danger"
                                  >
                                    삭제
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </section>
      </main>

      <PositionFormSheet
        onClose={() => setPositionSheet(null)}
        onSubmit={(input) => savePosition(input, positionSheet?.mode === "edit" ? positionSheet.position.id : undefined)}
        open={positionSheet !== null}
        position={positionSheet?.mode === "edit" ? positionSheet.position : undefined}
      />

      <PhaseFormSheet
        defaultPositionId={phaseSheet?.mode === "create" ? phaseSheet.positionId : undefined}
        onClose={() => setPhaseSheet(null)}
        onSubmit={(input) => savePhase(input, phaseSheet?.mode === "edit" ? phaseSheet.phase.id : undefined)}
        open={phaseSheet !== null}
        phase={phaseSheet?.mode === "edit" ? phaseSheet.phase : undefined}
        positions={positions}
      />

      <TaskFormSheet
        defaultPhaseId={taskSheet?.mode === "create" ? taskSheet.phaseId : undefined}
        onClose={() => setTaskSheet(null)}
        onSubmit={(input) => saveTask(input, taskSheet?.mode === "edit" ? taskSheet.task.id : undefined)}
        open={taskSheet !== null}
        phases={data.structure.phases}
        task={taskSheet?.mode === "edit" ? taskSheet.task : undefined}
      />

      <ConfirmDialog
        confirmLabel={deleteTarget?.type === "reset" ? "리셋하기" : "삭제하기"}
        description={
          deleteTarget?.type === "reset"
            ? "모든 구조와 체크 상태가 기본 시드 데이터로 바뀝니다."
            : `${deleteTarget?.title ?? ""} 항목을 삭제하면 관련 하위 데이터도 함께 지워집니다.`
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          if (deleteTarget.type === "reset") {
            resetToSeed();
          } else if (deleteTarget.type === "position") {
            deletePosition(deleteTarget.id);
          } else if (deleteTarget.type === "phase") {
            deletePhase(deleteTarget.id);
          } else {
            deleteTask(deleteTarget.id);
          }

          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        title={deleteTarget?.type === "reset" ? "초기 데이터로 리셋" : `${deleteTarget?.title ?? ""} 삭제`}
      />
    </AppShell>
  );
}
