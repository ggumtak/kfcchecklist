"use client";

import { useEffect, useState } from "react";

import { DEFAULT_PHASE_TYPES } from "@/features/checklist/lib/constants";
import type { Phase, Position } from "@/features/checklist/lib/types";
import { validatePhaseInput } from "@/features/checklist/lib/validation";
import { BottomSheet } from "@/shared/components/bottom-sheet";
import { Button } from "@/shared/components/button";
import { TextField } from "@/shared/components/field";

interface PhaseFormSheetProps {
  open: boolean;
  positions: Position[];
  phase?: Phase;
  defaultPositionId?: string;
  onClose: () => void;
  onSubmit: (input: { name: string; positionId: string; type: Phase["type"] }) => void;
}

export function PhaseFormSheet({
  defaultPositionId,
  onClose,
  onSubmit,
  open,
  phase,
  positions,
}: PhaseFormSheetProps) {
  const [name, setName] = useState("");
  const [positionId, setPositionId] = useState("");
  const [type, setType] = useState<Phase["type"]>("shift-start");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    setName(phase?.name ?? "");
    setPositionId(phase?.positionId ?? defaultPositionId ?? positions[0]?.id ?? "");
    setType(phase?.type ?? "shift-start");
    setErrors({});
  }, [defaultPositionId, open, phase, positions]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { name, positionId, type };
    const validation = validatePhaseInput(input);

    if (validation.name || validation.positionId) {
      setErrors(validation);
      return;
    }

    onSubmit(input);
    onClose();
  }

  return (
    <BottomSheet onClose={onClose} open={open} title={phase ? "단계 수정" : "단계 추가"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">포지션</span>
          <select
            className="min-h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            onChange={(event) => setPositionId(event.target.value)}
            value={positionId}
          >
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
          {errors.positionId ? <span className="text-xs text-danger">{errors.positionId}</span> : null}
        </label>
        <TextField
          autoFocus
          error={errors.name}
          label="단계 이름"
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 점심 피크"
          value={name}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">기본 타입</span>
          <select
            className="min-h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            onChange={(event) => setType(event.target.value as Phase["type"])}
            value={type}
          >
            {DEFAULT_PHASE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button fullWidth type="submit">
          저장
        </Button>
      </form>
    </BottomSheet>
  );
}
