import {
  LEGACY_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  STRUCTURE_STORAGE_KEY,
} from "@/features/checklist/lib/constants";
import type { ChecklistData } from "@/features/checklist/lib/types";

export interface ChecklistStorageAdapter {
  load(): Promise<ChecklistData | null>;
  save(data: ChecklistData): Promise<void>;
}

export function createLocalStorageAdapter(): ChecklistStorageAdapter {
  return {
    async load() {
      if (typeof window === "undefined") {
        return null;
      }

      const structureRaw = window.localStorage.getItem(STRUCTURE_STORAGE_KEY);
      const sessionRaw = window.localStorage.getItem(SESSION_STORAGE_KEY);

      if (structureRaw && sessionRaw) {
        try {
          const structurePayload = JSON.parse(structureRaw) as {
            version: number;
            createdAt: string;
            updatedAt: string;
            structure: ChecklistData["structure"];
          };
          const sessionPayload = JSON.parse(sessionRaw) as {
            version: number;
            createdAt: string;
            updatedAt: string;
            sessions: ChecklistData["sessions"];
            activeSessionId: string;
          };

          return {
            version: Math.max(structurePayload.version, sessionPayload.version),
            createdAt: structurePayload.createdAt,
            updatedAt: sessionPayload.updatedAt,
            structure: structurePayload.structure,
            sessions: sessionPayload.sessions,
            activeSessionId: sessionPayload.activeSessionId,
          };
        } catch {
          return null;
        }
      }

      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);

      if (!legacyRaw) {
        return null;
      }

      try {
        return JSON.parse(legacyRaw) as ChecklistData;
      } catch {
        return null;
      }
    },
    async save(data) {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(
        STRUCTURE_STORAGE_KEY,
        JSON.stringify({
          version: data.version,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          structure: data.structure,
        }),
      );
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          version: data.version,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          sessions: data.sessions,
          activeSessionId: data.activeSessionId,
        }),
      );
    },
  };
}
