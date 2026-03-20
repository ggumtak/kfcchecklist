import type { PhaseInput, PositionInput, TaskInput } from "@/features/checklist/lib/types";
import { isValidDueTime } from "@/features/checklist/lib/time";

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export function validatePositionInput(input: PositionInput) {
  const errors: ValidationErrors = {};

  if (!input.name.trim()) {
    errors.name = "포지션 이름을 입력해 주세요.";
  }

  return errors;
}

export function validatePhaseInput(input: PhaseInput) {
  const errors: ValidationErrors = {};

  if (!input.positionId) {
    errors.positionId = "포지션을 선택해 주세요.";
  }

  if (!input.name.trim()) {
    errors.name = "단계 이름을 입력해 주세요.";
  }

  return errors;
}

export function validateTaskInput(input: TaskInput) {
  const errors: ValidationErrors = {};

  if (!input.phaseId) {
    errors.phaseId = "단계를 선택해 주세요.";
  }

  if (!input.title.trim()) {
    errors.title = "업무 이름을 입력해 주세요.";
  }

  if (!isValidDueTime(input.dueTime)) {
    errors.dueTime = "시간은 HH:mm 형식으로 입력해 주세요.";
  }

  return errors;
}
