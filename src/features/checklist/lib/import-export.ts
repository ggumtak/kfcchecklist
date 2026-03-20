import { APP_DATA_VERSION } from "@/features/checklist/lib/constants";
import { ensureCurrentSession, restoreOrSeedData } from "@/features/checklist/lib/reset";
import type { ChecklistData, ImportPayload } from "@/features/checklist/lib/types";

export function createExportPayload(data: ChecklistData): ImportPayload {
  return {
    app: "kfc-checklist",
    exportedAt: new Date().toISOString(),
    data: {
      ...data,
      version: APP_DATA_VERSION,
    },
  };
}

export function parseImportPayload(text: string, now = new Date()) {
  const raw = JSON.parse(text) as Partial<ImportPayload>;

  if (!raw || raw.app !== "kfc-checklist" || !raw.data) {
    throw new Error("지원하지 않는 백업 파일입니다.");
  }

  return ensureCurrentSession(restoreOrSeedData(raw.data, now), now);
}
