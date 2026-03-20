import { beforeEach, describe, expect, it } from "vitest";

import { createSeedData } from "@/features/checklist/data/seed";
import {
  SESSION_STORAGE_KEY,
  STRUCTURE_STORAGE_KEY,
} from "@/features/checklist/lib/constants";
import { createLocalStorageAdapter } from "@/features/checklist/lib/storage";

describe("local storage adapter", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores structure and session data separately", async () => {
    const adapter = createLocalStorageAdapter();
    const data = createSeedData(new Date("2026-03-20T09:00:00.000Z"));

    await adapter.save(data);

    const structureRaw = window.localStorage.getItem(STRUCTURE_STORAGE_KEY);
    const sessionRaw = window.localStorage.getItem(SESSION_STORAGE_KEY);

    expect(structureRaw).toContain("\"positions\"");
    expect(sessionRaw).toContain("\"sessions\"");
  });

  it("loads combined data from split storage keys", async () => {
    const adapter = createLocalStorageAdapter();
    const data = createSeedData(new Date("2026-03-20T09:00:00.000Z"));

    await adapter.save(data);
    const loaded = await adapter.load();

    expect(loaded?.structure.tasks.length).toBe(data.structure.tasks.length);
    expect(loaded?.activeSessionId).toBe(data.activeSessionId);
  });
});
