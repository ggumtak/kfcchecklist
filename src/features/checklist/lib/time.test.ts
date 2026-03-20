import { describe, expect, it } from "vitest";

import { formatTimeLabel, isTaskOverdue, isValidDueTime } from "@/features/checklist/lib/time";

describe("time helpers", () => {
  it("validates due time input", () => {
    expect(isValidDueTime("22:30")).toBe(true);
    expect(isValidDueTime("24:30")).toBe(false);
  });

  it("formats labels for Korean time display", () => {
    expect(formatTimeLabel("20:45")).toBe("오후 8:45");
    expect(formatTimeLabel("09:05")).toBe("오전 9:05");
  });

  it("marks overdue tasks only when the due time has passed", () => {
    const now = new Date("2026-03-20T22:31:00");

    expect(isTaskOverdue("22:30", false, now)).toBe(true);
    expect(isTaskOverdue("22:30", true, now)).toBe(false);
    expect(isTaskOverdue("23:00", false, now)).toBe(false);
  });
});
