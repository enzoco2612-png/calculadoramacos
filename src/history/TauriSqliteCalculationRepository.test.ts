import { beforeEach, describe, expect, it, vi } from "vitest";
import { TauriSqliteCalculationRepository } from "./TauriSqliteCalculationRepository";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

describe("TauriSqliteCalculationRepository", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("inserts via history_insert IPC", async () => {
    invoke.mockResolvedValue(1);
    const repo = new TauriSqliteCalculationRepository();

    await repo.insert("427+379", "806");

    expect(invoke).toHaveBeenCalledWith("history_insert", {
      expression: "427+379",
      result: "806",
    });
  });

  it("lists via history_list IPC", async () => {
    const rows = [
      {
        id: 2,
        expression: "2+2",
        result: "4",
        created_at: "2024-01-02T00:00:00Z",
      },
      {
        id: 1,
        expression: "1+1",
        result: "2",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];
    invoke.mockResolvedValue(rows);
    const repo = new TauriSqliteCalculationRepository();

    await expect(repo.list()).resolves.toEqual(rows);
    expect(invoke).toHaveBeenCalledWith("history_list");
  });

  it("clears via history_clear IPC", async () => {
    invoke.mockResolvedValue(undefined);
    const repo = new TauriSqliteCalculationRepository();

    await repo.clear();
    expect(invoke).toHaveBeenCalledWith("history_clear");
  });

  it("propagates insert failure to caller (History Service swallows)", async () => {
    invoke.mockRejectedValue(new Error("sqlite unavailable"));
    const repo = new TauriSqliteCalculationRepository();

    await expect(repo.insert("1+1", "2")).rejects.toThrow("sqlite unavailable");
  });
});
