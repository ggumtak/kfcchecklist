import { APP_DATA_VERSION, DEFAULT_PHASE_NAMES } from "@/features/checklist/lib/constants";
import { createId } from "@/features/checklist/lib/id";
import { getNowIso, toDateKey } from "@/features/checklist/lib/time";
import type { ChecklistData, Phase, Position, Task, WorkSession } from "@/features/checklist/lib/types";

function phaseTemplate(
  positionId: string,
  name: string,
  type: Phase["type"],
  order: number,
  nowIso: string,
): Phase {
  return {
    id: createId("phase"),
    positionId,
    name,
    type,
    order,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function taskTemplate(phaseId: string, title: string, order: number, nowIso: string, dueTime?: string): Task {
  return {
    id: createId("task"),
    phaseId,
    title,
    dueTime,
    order,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function createEmptySession(now = new Date(), countForDate = 0): WorkSession {
  const nowIso = getNowIso(now);
  const dateKey = toDateKey(now);

  return {
    id: createId("session"),
    label: `${dateKey} 근무 ${countForDate + 1}`,
    dateKey,
    startedAt: nowIso,
    updatedAt: nowIso,
    taskStates: {},
  };
}

export function createSeedData(now = new Date()): ChecklistData {
  const nowIso = getNowIso(now);

  const counterPosition: Position = {
    id: createId("position"),
    name: "카운터",
    order: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const backPosition: Position = {
    id: createId("position"),
    name: "백",
    order: 2,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const counterPhases = [
    phaseTemplate(counterPosition.id, DEFAULT_PHASE_NAMES["shift-start"], "shift-start", 1, nowIso),
    phaseTemplate(counterPosition.id, DEFAULT_PHASE_NAMES["mid-shift"], "mid-shift", 2, nowIso),
    phaseTemplate(counterPosition.id, DEFAULT_PHASE_NAMES["pre-close"], "pre-close", 3, nowIso),
    phaseTemplate(counterPosition.id, DEFAULT_PHASE_NAMES["post-close"], "post-close", 4, nowIso),
  ];

  const backPhases = [
    phaseTemplate(backPosition.id, DEFAULT_PHASE_NAMES["shift-start"], "shift-start", 1, nowIso),
    phaseTemplate(backPosition.id, DEFAULT_PHASE_NAMES["mid-shift"], "mid-shift", 2, nowIso),
    phaseTemplate(backPosition.id, DEFAULT_PHASE_NAMES["pre-close"], "pre-close", 3, nowIso),
    phaseTemplate(backPosition.id, DEFAULT_PHASE_NAMES["post-close"], "post-close", 4, nowIso),
  ];

  const tasks: Task[] = [
    taskTemplate(counterPhases[0].id, "중간 중간 식세기 돌리기", 1, nowIso),
    taskTemplate(counterPhases[0].id, "자재 채우기", 2, nowIso),
    taskTemplate(counterPhases[0].id, "카운터 바닥 청소하기", 3, nowIso, "20:45"),
    taskTemplate(counterPhases[0].id, "커피머신 마감하기", 4, nowIso, "20:50"),
    taskTemplate(counterPhases[0].id, "3번째 홀딩 청소하기", 5, nowIso, "22:00"),
    taskTemplate(counterPhases[0].id, "텐더나 치킨들 합치거나 디너 박스에 옮겨 담기", 6, nowIso, "22:00"),
    taskTemplate(counterPhases[0].id, "카운터 쓰레기통 종파", 7, nowIso, "22:30"),
    taskTemplate(counterPhases[1].id, "중간 중간 식세기 돌리기", 1, nowIso),
    taskTemplate(counterPhases[1].id, "자재 채우기", 2, nowIso),
    taskTemplate(counterPhases[2].id, "라운드 쓸기", 1, nowIso, "22:30"),
    taskTemplate(counterPhases[2].id, "퇴식구 마감", 2, nowIso, "22:40"),
    taskTemplate(counterPhases[2].id, "음료 마감", 3, nowIso, "22:45"),
    taskTemplate(counterPhases[2].id, "라운드 닦기", 4, nowIso, "22:55"),
    taskTemplate(counterPhases[3].id, "키오스크 끄기", 1, nowIso, "23:00"),
    taskTemplate(counterPhases[3].id, "음료 마감(밖)", 2, nowIso, "23:00"),
    taskTemplate(counterPhases[3].id, "1,2번째 홀딩 닦기", 3, nowIso),
    taskTemplate(counterPhases[3].id, "사진 찍기", 4, nowIso),
    taskTemplate(backPhases[0].id, "예시 업무 1", 1, nowIso),
    taskTemplate(backPhases[1].id, "예시 업무 1", 1, nowIso),
    taskTemplate(backPhases[2].id, "예시 업무 1", 1, nowIso),
    taskTemplate(backPhases[3].id, "예시 업무 1", 1, nowIso),
  ];

  const session = createEmptySession(now);

  return {
    version: APP_DATA_VERSION,
    createdAt: nowIso,
    updatedAt: nowIso,
    structure: {
      positions: [counterPosition, backPosition],
      phases: [...counterPhases, ...backPhases],
      tasks,
    },
    sessions: [session],
    activeSessionId: session.id,
  };
}
