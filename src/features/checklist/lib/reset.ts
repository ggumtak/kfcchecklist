import { createEmptySession, createSeedData } from "@/features/checklist/data/seed";
import { APP_DATA_VERSION } from "@/features/checklist/lib/constants";
import { getNowIso, toDateKey } from "@/features/checklist/lib/time";
import type { ChecklistData, WorkSession } from "@/features/checklist/lib/types";

export function getActiveSession(data: ChecklistData): WorkSession | undefined {
  return data.sessions.find((session) => session.id === data.activeSessionId);
}

export function ensureCurrentSession(data: ChecklistData, now = new Date()): ChecklistData {
  const activeSession = getActiveSession(data);
  const todayKey = toDateKey(now);

  if (activeSession && activeSession.dateKey === todayKey) {
    return data;
  }

  const countForDate = data.sessions.filter((session) => session.dateKey === todayKey).length;
  const newSession = createEmptySession(now, countForDate);
  const nowIso = getNowIso(now);

  return {
    ...data,
    version: APP_DATA_VERSION,
    updatedAt: nowIso,
    sessions: [...data.sessions, newSession],
    activeSessionId: newSession.id,
  };
}

export function startNewShift(data: ChecklistData, now = new Date()) {
  const countForDate = data.sessions.filter((session) => session.dateKey === toDateKey(now)).length;
  const newSession = createEmptySession(now, countForDate);
  const nowIso = getNowIso(now);

  return {
    ...data,
    updatedAt: nowIso,
    sessions: [...data.sessions, newSession],
    activeSessionId: newSession.id,
  };
}

export function resetTodayChecklist(data: ChecklistData, now = new Date()) {
  const hydrated = ensureCurrentSession(data, now);
  const nowIso = getNowIso(now);

  return {
    ...hydrated,
    updatedAt: nowIso,
    sessions: hydrated.sessions.map((session) =>
      session.id === hydrated.activeSessionId
        ? {
            ...session,
            updatedAt: nowIso,
            taskStates: {},
          }
        : session,
    ),
  };
}

export function restoreOrSeedData(input: unknown, now = new Date()) {
  if (!input || typeof input !== "object") {
    return createSeedData(now);
  }

  const candidate = input as Partial<ChecklistData>;

  if (
    typeof candidate.activeSessionId !== "string" ||
    !candidate.structure ||
    !Array.isArray(candidate.sessions) ||
    !Array.isArray(candidate.structure.positions) ||
    !Array.isArray(candidate.structure.phases) ||
    !Array.isArray(candidate.structure.tasks)
  ) {
    return createSeedData(now);
  }

  return ensureCurrentSession(candidate as ChecklistData, now);
}
