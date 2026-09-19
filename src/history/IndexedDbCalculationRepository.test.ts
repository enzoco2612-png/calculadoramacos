import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { IndexedDbCalculationRepository } from "./IndexedDbCalculationRepository";

describe("IndexedDbCalculationRepository", () => {
  beforeEach(() => {
    indexedDB = new IDBFactory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts and lists ordered by created_at DESC", async () => {
    const repo = new IndexedDbCalculationRepository();
    vi.spyOn(Date.prototype, "toISOString")
      .mockReturnValueOnce("2024-01-01T00:00:00.000Z")
      .mockReturnValueOnce("2024-01-02T00:00:00.000Z")
      .mockReturnValueOnce("2024-01-03T00:00:00.000Z");

    await repo.insert("1+1", "2");
    await repo.insert("2+2", "4");
    await repo.insert("3+3", "6");

    const list = await repo.list();
    expect(list.map((r) => r.expression)).toEqual(["3+3", "2+2", "1+1"]);
    expect(list[0].result).toBe("6");
    expect(list[0].id).toBeTypeOf("number");
  });

  it("clear removes all rows", async () => {
    const repo = new IndexedDbCalculationRepository();
    await repo.insert("5×5", "25");
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });

  it("insert failure rejects when IndexedDB is unavailable", async () => {
    const original = globalThis.indexedDB;
    // Simulate open/storage failure path (SPEC §7)
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: undefined,
    });
    const repo = new IndexedDbCalculationRepository();

    await expect(repo.insert("1+1", "2")).rejects.toThrow("IndexedDB unavailable");

    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: original,
    });
  });
});
