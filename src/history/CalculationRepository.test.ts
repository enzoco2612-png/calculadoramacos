import { describe, expect, it, vi } from "vitest";
import type {
  CalculationRecord,
  CalculationRepository,
} from "./CalculationRepository";

/** In-memory stand-in validating the shared repository contract. */
class MemoryCalculationRepository implements CalculationRepository {
  private rows: CalculationRecord[] = [];
  private nextId = 1;

  async insert(expression: string, result: string): Promise<void> {
    this.rows.push({
      id: this.nextId++,
      expression,
      result,
      created_at: new Date(this.nextId * 1000).toISOString(),
    });
  }

  async list(): Promise<CalculationRecord[]> {
    return [...this.rows].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }

  async clear(): Promise<void> {
    this.rows = [];
  }
}

describe("CalculationRepository contract", () => {
  it("supports insert, list DESC, and clear", async () => {
    const repo: CalculationRepository = new MemoryCalculationRepository();
    await repo.insert("1+1", "2");
    await repo.insert("2+2", "4");

    const list = await repo.list();
    expect(list).toHaveLength(2);
    expect(list[0].expression).toBe("2+2");
    expect(list[1].expression).toBe("1+1");

    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });

  it("allows insert to reject for History Service to swallow", async () => {
    const repo: CalculationRepository = {
      insert: vi.fn().mockRejectedValue(new Error("fail")),
      list: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    await expect(repo.insert("1+1", "2")).rejects.toThrow("fail");
  });
});
