import { describe, expect, it, vi } from "vitest";
import type { CalculationRepository } from "./CalculationRepository";
import { createHistoryService } from "./historyService";

function mockRepo(
  overrides: Partial<CalculationRepository> = {},
): CalculationRepository {
  return {
    insert: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("History Service", () => {
  it("depends only on CalculationRepository for insert", async () => {
    const repo = mockRepo();
    const service = createHistoryService(repo);

    await service.persistCompleted("427+379", "806");

    expect(repo.insert).toHaveBeenCalledWith("427+379", "806");
    expect(repo.list).not.toHaveBeenCalled();
  });

  it("swallows repository insert failure without throwing", async () => {
    const repo = mockRepo({
      insert: vi.fn().mockRejectedValue(new Error("storage unavailable")),
    });
    const service = createHistoryService(repo);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      service.persistCompleted("1+1", "2"),
    ).resolves.toBeUndefined();

    expect(repo.insert).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
