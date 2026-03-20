import { describe, expect, it } from "vitest";

import { createSeedData } from "@/features/checklist/data/seed";
import { checklistReducer } from "@/features/checklist/lib/reducer";

describe("checklist reducer", () => {
  it("supports position add, edit, move, and delete", () => {
    const base = {
      status: "ready" as const,
      data: createSeedData(new Date("2026-03-20T09:00:00.000Z")),
    };

    const added = checklistReducer(base, {
      type: "POSITION_SAVE",
      input: { name: "드라이브 스루" },
    });
    const created = added.data.structure.positions.find((position) => position.name === "드라이브 스루");

    expect(created).toBeTruthy();

    const edited = checklistReducer(added, {
      type: "POSITION_SAVE",
      positionId: created!.id,
      input: { name: "DT" },
    });

    expect(edited.data.structure.positions.find((position) => position.id === created!.id)?.name).toBe("DT");

    const moved = checklistReducer(edited, {
      type: "POSITION_MOVE",
      positionId: created!.id,
      direction: "up",
    });

    expect(moved.data.structure.positions.find((position) => position.id === created!.id)?.order).toBe(2);

    const removed = checklistReducer(moved, {
      type: "POSITION_DELETE",
      positionId: created!.id,
    });

    expect(removed.data.structure.positions.some((position) => position.id === created!.id)).toBe(false);
  });

  it("supports phase and task parent changes with stable ordering", () => {
    const base = {
      status: "ready" as const,
      data: createSeedData(new Date("2026-03-20T09:00:00.000Z")),
    };

    const counter = base.data.structure.positions[0]!;
    const back = base.data.structure.positions[1]!;
    const counterPhase = base.data.structure.phases.find((phase) => phase.positionId === counter.id)!;
    const backPhase = base.data.structure.phases.find((phase) => phase.positionId === back.id)!;
    const task = base.data.structure.tasks.find((item) => item.phaseId === counterPhase.id)!;

    const movedPhase = checklistReducer(base, {
      type: "PHASE_SAVE",
      phaseId: counterPhase.id,
      input: {
        name: "옮긴 단계",
        positionId: back.id,
        type: counterPhase.type,
      },
    });

    expect(movedPhase.data.structure.phases.find((phase) => phase.id === counterPhase.id)?.positionId).toBe(back.id);

    const movedTask = checklistReducer(movedPhase, {
      type: "TASK_SAVE",
      taskId: task.id,
      input: {
        title: "옮긴 업무",
        phaseId: backPhase.id,
        dueTime: "21:30",
      },
    });

    const updatedTask = movedTask.data.structure.tasks.find((item) => item.id === task.id);

    expect(updatedTask?.phaseId).toBe(backPhase.id);
    expect(updatedTask?.dueTime).toBe("21:30");
  });

  it("duplicates, reorders, and deletes tasks", () => {
    const base = {
      status: "ready" as const,
      data: createSeedData(new Date("2026-03-20T09:00:00.000Z")),
    };
    const phase = base.data.structure.phases[0]!;
    const original = base.data.structure.tasks.find((task) => task.phaseId === phase.id)!;

    const duplicated = checklistReducer(base, {
      type: "TASK_DUPLICATE",
      taskId: original.id,
    });
    const copied = duplicated.data.structure.tasks.find((task) => task.title.includes("(복사)"));

    expect(copied).toBeTruthy();

    const moved = checklistReducer(duplicated, {
      type: "TASK_MOVE",
      taskId: copied!.id,
      direction: "down",
    });

    expect(moved.data.structure.tasks.find((task) => task.id === copied!.id)?.order).toBeGreaterThan(copied!.order);

    const removed = checklistReducer(moved, {
      type: "TASK_DELETE",
      taskId: copied!.id,
    });

    expect(removed.data.structure.tasks.some((task) => task.id === copied!.id)).toBe(false);
  });
});
