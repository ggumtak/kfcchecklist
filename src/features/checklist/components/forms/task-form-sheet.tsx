"use client";

import { useEffect, useState } from "react";

import type { Phase, Task } from "@/features/checklist/lib/types";
import { validateTaskInput } from "@/features/checklist/lib/validation";
import { BottomSheet } from "@/shared/components/bottom-sheet";
import { Button } from "@/shared/components/button";
import { TextAreaField, TextField } from "@/shared/components/field";

interface TaskFormSheetProps {
  open: boolean;
  task?: Task;
  phases: Phase[];
  defaultPhaseId?: string;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    memo?: string;
    dueTime?: string;
    notes?: string;
    phaseId: string;
  }) => void;
}

export function TaskFormSheet({
  defaultPhaseId,
  onClose,
  onSubmit,
  open,
  phases,
  task,
}: TaskFormSheetProps) {
  const [phaseId, setPhaseId] = useState("");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    setPhaseId(task?.phaseId ?? defaultPhaseId ?? phases[0]?.id ?? "");
    setTitle(task?.title ?? "");
    setMemo(task?.memo ?? "");
    setDueTime(task?.dueTime ?? "");
    setNotes(task?.notes ?? "");
    setErrors({});
  }, [defaultPhaseId, open, phases, task]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      phaseId,
      title,
      memo: memo || undefined,
      dueTime: dueTime || undefined,
      notes: notes || undefined,
    };
    const validation = validateTaskInput(input);

    if (Object.values(validation).some(Boolean)) {
      setErrors(validation);
      return;
    }

    onSubmit(input);
    onClose();
  }

  return (
    <BottomSheet onClose={onClose} open={open} title={task ? "업무 수정" : "업무 추가"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">단계</span>
          <select
            className="min-h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            onChange={(event) => setPhaseId(event.target.value)}
            value={phaseId}
          >
            {phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
          {errors.phaseId ? <span className="text-xs text-danger">{errors.phaseId}</span> : null}
        </label>
        <TextField
          autoFocus
          error={errors.title}
          label="업무 이름"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 바닥 마감"
          value={title}
        />
        <TextField
          hint="선택 사항"
          label="간단 메모"
          onChange={(event) => setMemo(event.target.value)}
          placeholder="예: 먼저 자재 비우기"
          value={memo}
        />
        <TextField
          error={errors.dueTime}
          hint="HH:mm"
          label="해야 하는 시간"
          onChange={(event) => setDueTime(event.target.value)}
          placeholder="22:30"
          value={dueTime}
        />
        <TextAreaField
          hint="선택 사항"
          label="상세 노트"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="교대자에게 넘길 내용이 있으면 적어 두세요."
          value={notes}
        />
        <Button fullWidth type="submit">
          저장
        </Button>
      </form>
    </BottomSheet>
  );
}
