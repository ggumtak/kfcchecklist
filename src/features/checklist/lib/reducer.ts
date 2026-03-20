import { createSeedData } from "@/features/checklist/data/seed";
import { APP_DATA_VERSION } from "@/features/checklist/lib/constants";
import { createId } from "@/features/checklist/lib/id";
import { resetTodayChecklist, startNewShift } from "@/features/checklist/lib/reset";
import { getNowIso } from "@/features/checklist/lib/time";
import type { ChecklistData, Phase, PhaseInput, Position, PositionInput, Task, TaskInput } from "@/features/checklist/lib/types";

export interface ChecklistState {
  status: "loading" | "ready";
  data: ChecklistData;
}

type Direction = "up" | "down";

export type ChecklistAction =
  | { type: "HYDRATE"; data: ChecklistData }
  | { type: "POSITION_SAVE"; input: PositionInput; positionId?: string }
  | { type: "POSITION_DELETE"; positionId: string }
  | { type: "POSITION_MOVE"; positionId: string; direction: Direction }
  | { type: "PHASE_SAVE"; input: PhaseInput; phaseId?: string }
  | { type: "PHASE_DELETE"; phaseId: string }
  | { type: "PHASE_MOVE"; phaseId: string; direction: Direction }
  | { type: "TASK_SAVE"; input: TaskInput; taskId?: string }
  | { type: "TASK_DELETE"; taskId: string }
  | { type: "TASK_MOVE"; taskId: string; direction: Direction }
  | { type: "TASK_DUPLICATE"; taskId: string }
  | { type: "TASK_TOGGLE"; taskId: string }
  | { type: "PHASE_TOGGLE_ALL"; phaseId: string; completed: boolean }
  | { type: "RESET_TODAY"; now?: Date }
  | { type: "START_NEW_SHIFT"; now?: Date }
  | { type: "RESET_TO_SEED"; now?: Date }
  | { type: "IMPORT_DATA"; data: ChecklistData };

export function createInitialState() {
  return {
    status: "loading" as const,
    data: createSeedData(),
  };
}

function normalizeOrder<T extends { order: number }>(items: T[]) {
  return resequence([...items].sort((left, right) => left.order - right.order));
}

function resequence<T extends { order: number }>(items: T[]) {
  return items.map((item, index) => ({ ...item, order: index + 1 }));
}

function updateSiblings<T extends { id: string; order: number }>(
  items: T[],
  predicate: (item: T) => boolean,
  targetId: string,
  direction: Direction,
) {
  const siblings = normalizeOrder(items.filter(predicate));
  const index = siblings.findIndex((item) => item.id === targetId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || nextIndex < 0 || nextIndex >= siblings.length) {
    return items;
  }

  const reordered = [...siblings];
  const current = reordered[index];
  reordered[index] = reordered[nextIndex];
  reordered[nextIndex] = current;

  const normalized = resequence(reordered);
  return items.map((item) => normalized.find((candidate) => candidate.id === item.id) ?? item);
}

function insertAfter<T extends { id: string; order: number }>(
  items: T[],
  predicate: (item: T) => boolean,
  afterId: string,
  copy: T,
) {
  const siblings = normalizeOrder(items.filter(predicate));
  const index = siblings.findIndex((item) => item.id === afterId);

  if (index === -1) {
    return [...items, copy];
  }

  const reordered = [...siblings];
  reordered.splice(index + 1, 0, copy);
  const normalized = resequence(reordered);

  return items.filter((item) => !predicate(item)).concat(normalized);
}

function moveBetweenGroups<T extends { id: string; order: number }>(
  items: T[],
  itemId: string,
  getGroupId: (item: T) => string,
  nextGroupId: string,
) {
  const target = items.find((item) => item.id === itemId);

  if (!target) {
    return items;
  }

  const currentGroupId = getGroupId(target);

  if (currentGroupId === nextGroupId) {
    return items;
  }

  const remainingItems = items.filter((item) => item.id !== itemId);
  const currentGroup = normalizeOrder(remainingItems.filter((item) => getGroupId(item) === currentGroupId));
  const nextGroup = normalizeOrder(remainingItems.filter((item) => getGroupId(item) === nextGroupId));
  const otherItems = remainingItems.filter((item) => {
    const groupId = getGroupId(item);
    return groupId !== currentGroupId && groupId !== nextGroupId;
  });

  const movedItem = {
    ...target,
    order: nextGroup.length + 1,
  };

  return [...otherItems, ...currentGroup, ...nextGroup, movedItem];
}

function removeTaskStates(data: ChecklistData, taskIds: string[]) {
  const taskIdSet = new Set(taskIds);

  return data.sessions.map((session) => ({
    ...session,
    taskStates: Object.fromEntries(
      Object.entries(session.taskStates).filter(([taskId]) => !taskIdSet.has(taskId)),
    ),
  }));
}

function reduceData(data: ChecklistData, action: ChecklistAction): ChecklistData {
  const nowIso = getNowIso();

  switch (action.type) {
    case "HYDRATE":
      return action.data;
    case "POSITION_SAVE":
      if (action.positionId) {
        return {
          ...data,
          updatedAt: nowIso,
          structure: {
            ...data.structure,
            positions: data.structure.positions.map((position) =>
              position.id === action.positionId
                ? { ...position, name: action.input.name.trim(), updatedAt: nowIso }
                : position,
            ),
          },
        };
      }
      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          positions: [
            ...data.structure.positions,
            {
              id: createId("position"),
              name: action.input.name.trim(),
              order: data.structure.positions.length + 1,
              createdAt: nowIso,
              updatedAt: nowIso,
            } satisfies Position,
          ],
        },
      };
    case "POSITION_DELETE": {
      const phaseIds = data.structure.phases.filter((phase) => phase.positionId === action.positionId).map((phase) => phase.id);
      const taskIds = data.structure.tasks.filter((task) => phaseIds.includes(task.phaseId)).map((task) => task.id);
      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          positions: normalizeOrder(data.structure.positions.filter((position) => position.id !== action.positionId)),
          phases: data.structure.phases.filter((phase) => phase.positionId !== action.positionId),
          tasks: data.structure.tasks.filter((task) => !phaseIds.includes(task.phaseId)),
        },
        sessions: removeTaskStates(data, taskIds),
      };
    }
    case "POSITION_MOVE":
      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          positions: updateSiblings(data.structure.positions, () => true, action.positionId, action.direction),
        },
      };
    case "PHASE_SAVE":
      if (action.phaseId) {
        const originalPhase = data.structure.phases.find((phase) => phase.id === action.phaseId);
        const movedPhases =
          originalPhase && originalPhase.positionId !== action.input.positionId
            ? moveBetweenGroups(data.structure.phases, action.phaseId, (phase) => phase.positionId, action.input.positionId)
            : data.structure.phases;

        return {
          ...data,
          updatedAt: nowIso,
          structure: {
            ...data.structure,
            phases: movedPhases.map((phase) =>
              phase.id === action.phaseId
                ? {
                    ...phase,
                    name: action.input.name.trim(),
                    positionId: action.input.positionId,
                    type: action.input.type,
                    updatedAt: nowIso,
                  }
                : phase,
            ),
          },
        };
      }
      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          phases: [
            ...data.structure.phases,
            {
              id: createId("phase"),
              positionId: action.input.positionId,
              name: action.input.name.trim(),
              type: action.input.type,
              order: data.structure.phases.filter((phase) => phase.positionId === action.input.positionId).length + 1,
              createdAt: nowIso,
              updatedAt: nowIso,
            } satisfies Phase,
          ],
        },
      };
    case "PHASE_DELETE": {
      const deletedPhase = data.structure.phases.find((phase) => phase.id === action.phaseId);
      const taskIds = data.structure.tasks.filter((task) => task.phaseId === action.phaseId).map((task) => task.id);
      const remainingPhases = data.structure.phases.filter((phase) => phase.id !== action.phaseId);
      const siblingPhases = normalizeOrder(
        remainingPhases.filter((phase) => phase.positionId === deletedPhase?.positionId),
      );
      const otherPhases = remainingPhases.filter((phase) => phase.positionId !== deletedPhase?.positionId);

      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          phases: [...siblingPhases, ...otherPhases],
          tasks: data.structure.tasks.filter((task) => task.phaseId !== action.phaseId),
        },
        sessions: removeTaskStates(data, taskIds),
      };
    }
    case "PHASE_MOVE": {
      const phase = data.structure.phases.find((item) => item.id === action.phaseId);
      if (!phase) {
        return data;
      }
      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          phases: updateSiblings(
            data.structure.phases,
            (item) => item.positionId === phase.positionId,
            action.phaseId,
            action.direction,
          ),
        },
      };
    }
    case "TASK_SAVE":
      if (action.taskId) {
        const originalTask = data.structure.tasks.find((task) => task.id === action.taskId);
        const movedTasks =
          originalTask && originalTask.phaseId !== action.input.phaseId
            ? moveBetweenGroups(data.structure.tasks, action.taskId, (task) => task.phaseId, action.input.phaseId)
            : data.structure.tasks;

        return {
          ...data,
          updatedAt: nowIso,
          structure: {
            ...data.structure,
            tasks: movedTasks.map((task) =>
              task.id === action.taskId
                ? {
                    ...task,
                    title: action.input.title.trim(),
                    memo: action.input.memo?.trim() || undefined,
                    dueTime: action.input.dueTime?.trim() || undefined,
                    notes: action.input.notes?.trim() || undefined,
                    phaseId: action.input.phaseId,
                    updatedAt: nowIso,
                  }
                : task,
            ),
          },
        };
      }
      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          tasks: [
            ...data.structure.tasks,
            {
              id: createId("task"),
              phaseId: action.input.phaseId,
              title: action.input.title.trim(),
              memo: action.input.memo?.trim() || undefined,
              dueTime: action.input.dueTime?.trim() || undefined,
              notes: action.input.notes?.trim() || undefined,
              order: data.structure.tasks.filter((task) => task.phaseId === action.input.phaseId).length + 1,
              createdAt: nowIso,
              updatedAt: nowIso,
            } satisfies Task,
          ],
        },
      };
    case "TASK_DELETE": {
      const deletedTask = data.structure.tasks.find((task) => task.id === action.taskId);
      const remainingTasks = data.structure.tasks.filter((task) => task.id !== action.taskId);
      const siblingTasks = normalizeOrder(
        remainingTasks.filter((task) => task.phaseId === deletedTask?.phaseId),
      );
      const otherTasks = remainingTasks.filter((task) => task.phaseId !== deletedTask?.phaseId);

      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          tasks: [...siblingTasks, ...otherTasks],
        },
        sessions: removeTaskStates(data, [action.taskId]),
      };
    }
    case "TASK_MOVE": {
      const task = data.structure.tasks.find((item) => item.id === action.taskId);
      if (!task) {
        return data;
      }
      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          tasks: updateSiblings(
            data.structure.tasks,
            (item) => item.phaseId === task.phaseId,
            action.taskId,
            action.direction,
          ),
        },
      };
    }
    case "TASK_DUPLICATE": {
      const source = data.structure.tasks.find((task) => task.id === action.taskId);
      if (!source) {
        return data;
      }
      const duplicate: Task = {
        ...source,
        id: createId("task"),
        title: `${source.title} (복사)`,
        order: source.order + 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      return {
        ...data,
        updatedAt: nowIso,
        structure: {
          ...data.structure,
          tasks: insertAfter(data.structure.tasks, (task) => task.phaseId === source.phaseId, source.id, duplicate),
        },
      };
    }
    case "TASK_TOGGLE":
      return {
        ...data,
        updatedAt: nowIso,
        sessions: data.sessions.map((session) =>
          session.id === data.activeSessionId
            ? {
                ...session,
                updatedAt: nowIso,
                taskStates: {
                  ...session.taskStates,
                  [action.taskId]: {
                    completed: !session.taskStates[action.taskId]?.completed,
                    completedAt: !session.taskStates[action.taskId]?.completed ? nowIso : undefined,
                  },
                },
              }
            : session,
        ),
      };
    case "PHASE_TOGGLE_ALL": {
      const phaseTaskIds = data.structure.tasks.filter((task) => task.phaseId === action.phaseId).map((task) => task.id);
      return {
        ...data,
        updatedAt: nowIso,
        sessions: data.sessions.map((session) => {
          if (session.id !== data.activeSessionId) {
            return session;
          }
          const nextTaskStates = { ...session.taskStates };
          phaseTaskIds.forEach((taskId) => {
            nextTaskStates[taskId] = {
              completed: action.completed,
              completedAt: action.completed ? nowIso : undefined,
            };
          });
          return {
            ...session,
            updatedAt: nowIso,
            taskStates: nextTaskStates,
          };
        }),
      };
    }
    case "RESET_TODAY":
      return resetTodayChecklist(data, action.now ?? new Date());
    case "START_NEW_SHIFT":
      return startNewShift(data, action.now ?? new Date());
    case "RESET_TO_SEED":
      return createSeedData(action.now);
    case "IMPORT_DATA":
      return { ...action.data, version: APP_DATA_VERSION };
    default:
      return data;
  }
}

export function checklistReducer(state: ChecklistState, action: ChecklistAction): ChecklistState {
  if (action.type === "HYDRATE") {
    return {
      status: "ready",
      data: action.data,
    };
  }

  return {
    status: state.status === "loading" ? "ready" : state.status,
    data: reduceData(state.data, action),
  };
}
