export type PhaseType = "shift-start" | "mid-shift" | "pre-close" | "post-close" | "custom";
export type TaskFilter = "all" | "pending" | "timed";

export interface Position {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Phase {
  id: string;
  positionId: string;
  name: string;
  type: PhaseType;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  phaseId: string;
  title: string;
  memo?: string;
  dueTime?: string;
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistStructure {
  positions: Position[];
  phases: Phase[];
  tasks: Task[];
}

export interface TaskState {
  completed: boolean;
  completedAt?: string;
}

export interface WorkSession {
  id: string;
  label: string;
  dateKey: string;
  startedAt: string;
  updatedAt: string;
  taskStates: Record<string, TaskState>;
}

export interface ChecklistData {
  version: number;
  createdAt: string;
  updatedAt: string;
  structure: ChecklistStructure;
  sessions: WorkSession[];
  activeSessionId: string;
}

export interface PositionInput {
  name: string;
}

export interface PhaseInput {
  positionId: string;
  name: string;
  type: PhaseType;
}

export interface TaskInput {
  phaseId: string;
  title: string;
  memo?: string;
  dueTime?: string;
  notes?: string;
}

export interface ImportPayload {
  exportedAt: string;
  app: string;
  data: ChecklistData;
}
