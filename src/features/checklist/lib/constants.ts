import type { PhaseType } from "@/features/checklist/lib/types";

export const LEGACY_STORAGE_KEY = "kfc-checklist-data-v1";
export const STRUCTURE_STORAGE_KEY = "kfc-checklist-structure-v1";
export const SESSION_STORAGE_KEY = "kfc-checklist-sessions-v1";
export const APP_DATA_VERSION = 1;

export const DEFAULT_PHASE_TYPES: Array<{ label: string; value: PhaseType }> = [
  { label: "알바 시작", value: "shift-start" },
  { label: "알바 중간", value: "mid-shift" },
  { label: "마감 직전", value: "pre-close" },
  { label: "마감 후", value: "post-close" },
  { label: "직접 입력", value: "custom" },
];

export const DEFAULT_PHASE_NAMES: Record<Exclude<PhaseType, "custom">, string> = {
  "shift-start": "알바 시작",
  "mid-shift": "알바 중간",
  "pre-close": "마감 직전",
  "post-close": "마감 후",
};
