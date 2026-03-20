"use client";

import { useEffect, useState } from "react";

import type { Position } from "@/features/checklist/lib/types";
import { validatePositionInput } from "@/features/checklist/lib/validation";
import { BottomSheet } from "@/shared/components/bottom-sheet";
import { Button } from "@/shared/components/button";
import { TextField } from "@/shared/components/field";

interface PositionFormSheetProps {
  open: boolean;
  position?: Position;
  onClose: () => void;
  onSubmit: (input: { name: string }) => void;
}

export function PositionFormSheet({ onClose, onSubmit, open, position }: PositionFormSheetProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    setName(position?.name ?? "");
    setError(undefined);
  }, [open, position]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { name };
    const errors = validatePositionInput(input);

    if (errors.name) {
      setError(errors.name);
      return;
    }

    onSubmit(input);
    onClose();
  }

  return (
    <BottomSheet onClose={onClose} open={open} title={position ? "포지션 수정" : "포지션 추가"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          autoFocus
          error={error}
          label="포지션 이름"
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 드라이브 스루"
          value={name}
        />
        <Button fullWidth type="submit">
          저장
        </Button>
      </form>
    </BottomSheet>
  );
}
