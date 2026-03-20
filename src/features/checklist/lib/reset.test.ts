import { describe, expect, it } from "vitest";

import { createSeedData } from "@/features/checklist/data/seed";
import { ensureCurrentSession, resetTodayChecklist, startNewShift } from "@/features/checklist/lib/reset";

describe("daily reset logic", () => {
  it("creates a new session when the date changes", () => {
    const base = createSeedData(new Date("2026-03-20T09:00:00.000Z"));
    const hydrated = ensureCurrentSession(base, new Date("2026-03-21T00:10:00.000Z"));

    expect(hydrated.sessions).toHaveLength(2);
    expect(hydrated.sessions[1]?.dateKey).toBe("2026-03-21");
  });

  it("clears only the active session task states on reset", () => {
    const base = createSeedData(new Date("2026-03-20T09:00:00.000Z"));
    base.sessions[0]!.taskStates.sample = { completed: true, completedAt: "2026-03-20T09:10:00.000Z" };

    const reset = resetTodayChecklist(base, new Date("2026-03-20T10:00:00.000Z"));

    expect(Object.keys(reset.sessions[0]?.taskStates ?? {})).toHaveLength(0);
  });

  it("can start a second shift on the same day", () => {
    const base = createSeedData(new Date("2026-03-20T09:00:00.000Z"));
    const next = startNewShift(base, new Date("2026-03-20T12:00:00.000Z"));

    expect(next.sessions).toHaveLength(2);
    expect(next.sessions[1]?.label).toContain("근무 2");
  });
});
