import { getActiveSession } from "@/features/checklist/lib/reset";
import { formatTimeLabel, isTaskOverdue } from "@/features/checklist/lib/time";
import type { ChecklistData, Phase, Position, Task, TaskFilter } from "@/features/checklist/lib/types";

export interface ProgressInfo {
  completed: number;
  total: number;
  percent: number;
}

export function orderByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order - right.order);
}

export function getPositions(data: ChecklistData) {
  return orderByOrder(data.structure.positions);
}

export function getPhasesForPosition(data: ChecklistData, positionId: string) {
  return orderByOrder(data.structure.phases.filter((phase) => phase.positionId === positionId));
}

export function getTasksForPhase(data: ChecklistData, phaseId: string) {
  return orderByOrder(data.structure.tasks.filter((task) => task.phaseId === phaseId));
}

export function getTaskStateMap(data: ChecklistData) {
  return getActiveSession(data)?.taskStates ?? {};
}

export function getProgressForTaskIds(data: ChecklistData, taskIds: string[]): ProgressInfo {
  const taskStates = getTaskStateMap(data);
  const total = taskIds.length;
  const completed = taskIds.filter((taskId) => taskStates[taskId]?.completed).length;

  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function getProgressForPhase(data: ChecklistData, phaseId: string) {
  return getProgressForTaskIds(data, getTasksForPhase(data, phaseId).map((task) => task.id));
}

export function getProgressForPosition(data: ChecklistData, positionId: string) {
  const phaseIds = getPhasesForPosition(data, positionId).map((phase) => phase.id);
  const taskIds = data.structure.tasks.filter((task) => phaseIds.includes(task.phaseId)).map((task) => task.id);

  return getProgressForTaskIds(data, taskIds);
}

export function getPendingTaskCount(data: ChecklistData, positionId: string) {
  const progress = getProgressForPosition(data, positionId);
  return progress.total - progress.completed;
}

export function filterTasks(
  tasks: Task[],
  data: ChecklistData,
  query: string,
  filter: TaskFilter,
  now = new Date(),
) {
  const normalizedQuery = query.trim().toLowerCase();
  const taskStates = getTaskStateMap(data);

  return tasks
    .filter((task) => {
      const completed = Boolean(taskStates[task.id]?.completed);
      const matchesQuery = normalizedQuery ? task.title.toLowerCase().includes(normalizedQuery) : true;

      if (!matchesQuery) {
        return false;
      }

      if (filter === "pending" && completed) {
        return false;
      }

      if (filter === "timed" && !task.dueTime) {
        return false;
      }

      return true;
    })
    .map((task) => ({
      ...task,
      completed: Boolean(taskStates[task.id]?.completed),
      overdue: isTaskOverdue(task.dueTime, Boolean(taskStates[task.id]?.completed), now),
      timeLabel: formatTimeLabel(task.dueTime),
    }));
}

export function findPosition(data: ChecklistData, positionId: string): Position | undefined {
  return data.structure.positions.find((position) => position.id === positionId);
}

export function findPhase(data: ChecklistData, phaseId: string): Phase | undefined {
  return data.structure.phases.find((phase) => phase.id === phaseId);
}

export function getSummaryCounts(data: ChecklistData) {
  return {
    positions: data.structure.positions.length,
    phases: data.structure.phases.length,
    tasks: data.structure.tasks.length,
    completedTasks: Object.values(getTaskStateMap(data)).filter((state) => state.completed).length,
  };
}
