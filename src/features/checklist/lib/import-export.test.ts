import { describe, expect, it } from "vitest";

import { createSeedData } from "@/features/checklist/data/seed";
import { createExportPayload, parseImportPayload } from "@/features/checklist/lib/import-export";

describe("backup import/export", () => {
  it("exports a supported payload and restores it", () => {
    const source = createSeedData(new Date("2026-03-20T09:00:00.000Z"));
    const payload = createExportPayload(source);
    const restored = parseImportPayload(JSON.stringify(payload), new Date("2026-03-20T10:00:00.000Z"));

    expect(restored.structure.positions[0]?.name).toBe(source.structure.positions[0]?.name);
    expect(restored.structure.tasks).toHaveLength(source.structure.tasks.length);
  });

  it("throws on unsupported payload", () => {
    expect(() => parseImportPayload(JSON.stringify({ hello: "world" }))).toThrowError();
  });
});
