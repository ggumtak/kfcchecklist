"use client";

import { createContext, useContext, useEffect, useReducer, useState } from "react";
import type { PropsWithChildren } from "react";

import { createSeedData } from "@/features/checklist/data/seed";
import { parseImportPayload } from "@/features/checklist/lib/import-export";
import { checklistReducer, createInitialState } from "@/features/checklist/lib/reducer";
import { restoreOrSeedData } from "@/features/checklist/lib/reset";
import { createLocalStorageAdapter } from "@/features/checklist/lib/storage";
import type { ChecklistData, PhaseInput, PositionInput, TaskInput } from "@/features/checklist/lib/types";

const storage = createLocalStorageAdapter();
const ChecklistContext = createContext<ChecklistContextValue | null>(null);

interface ChecklistContextValue {
  status: "loading" | "ready";
  data: ChecklistData;
  savePosition: (input: PositionInput, positionId?: string) => void;
  deletePosition: (positionId: string) => void;
  movePosition: (positionId: string, direction: "up" | "down") => void;
  savePhase: (input: PhaseInput, phaseId?: string) => void;
  deletePhase: (phaseId: string) => void;
  movePhase: (phaseId: string, direction: "up" | "down") => void;
  saveTask: (input: TaskInput, taskId?: string) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, direction: "up" | "down") => void;
  duplicateTask: (taskId: string) => void;
  toggleTask: (taskId: string) => void;
  togglePhaseTasks: (phaseId: string, completed: boolean) => void;
  resetToday: () => void;
  startNewShift: () => void;
  resetToSeed: () => void;
  importData: (text: string) => void;
  isOnline: boolean;
}

export function ChecklistProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(checklistReducer, undefined, createInitialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const stored = await storage.load();
      const nextData = restoreOrSeedData(stored ?? createSeedData(), new Date());

      if (!cancelled) {
        dispatch({ type: "HYDRATE", data: nextData });
        setIsLoaded(true);
      }
    }

    hydrate().catch(() => {
      if (!cancelled) {
        dispatch({ type: "HYDRATE", data: createSeedData() });
        setIsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || state.status !== "ready") {
      return;
    }

    storage.save(state.data).catch(() => undefined);
  }, [isLoaded, state.data, state.status]);

  const value: ChecklistContextValue = {
    status: state.status,
    data: state.data,
    savePosition(input, positionId) {
      dispatch({ type: "POSITION_SAVE", input, positionId });
    },
    deletePosition(positionId) {
      dispatch({ type: "POSITION_DELETE", positionId });
    },
    movePosition(positionId, direction) {
      dispatch({ type: "POSITION_MOVE", positionId, direction });
    },
    savePhase(input, phaseId) {
      dispatch({ type: "PHASE_SAVE", input, phaseId });
    },
    deletePhase(phaseId) {
      dispatch({ type: "PHASE_DELETE", phaseId });
    },
    movePhase(phaseId, direction) {
      dispatch({ type: "PHASE_MOVE", phaseId, direction });
    },
    saveTask(input, taskId) {
      dispatch({ type: "TASK_SAVE", input, taskId });
    },
    deleteTask(taskId) {
      dispatch({ type: "TASK_DELETE", taskId });
    },
    moveTask(taskId, direction) {
      dispatch({ type: "TASK_MOVE", taskId, direction });
    },
    duplicateTask(taskId) {
      dispatch({ type: "TASK_DUPLICATE", taskId });
    },
    toggleTask(taskId) {
      dispatch({ type: "TASK_TOGGLE", taskId });
    },
    togglePhaseTasks(phaseId, completed) {
      dispatch({ type: "PHASE_TOGGLE_ALL", phaseId, completed });
    },
    resetToday() {
      dispatch({ type: "RESET_TODAY" });
    },
    startNewShift() {
      dispatch({ type: "START_NEW_SHIFT" });
    },
    resetToSeed() {
      dispatch({ type: "RESET_TO_SEED" });
    },
    importData(text) {
      dispatch({ type: "IMPORT_DATA", data: parseImportPayload(text) });
    },
    isOnline,
  };

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}

export function useChecklist() {
  const context = useContext(ChecklistContext);

  if (!context) {
    throw new Error("ChecklistProvider 내부에서만 useChecklist를 사용할 수 있습니다.");
  }

  return context;
}
