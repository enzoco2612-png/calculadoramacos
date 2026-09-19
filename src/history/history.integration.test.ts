import { describe, expect, it, vi } from "vitest";
import { initialContext, reduce, type CalculatorEvent } from "../calculator";
import type { CalculationRepository } from "./CalculationRepository";
import { createHistoryService } from "./historyService";
import { shouldPersistCompleted } from "./shouldPersist";

function runEvents(events: CalculatorEvent[]) {
  return events.reduce(reduce, initialContext());
}

describe("shouldPersistCompleted", () => {
  it("is true after successful equals", () => {
    const prev = runEvents([
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
    ]);
    const event: CalculatorEvent = { type: "equals" };
    const next = reduce(prev, event);

    expect(next.state).toBe("Result");
    expect(shouldPersistCompleted(prev, event, next)).toBe(true);
  });

  it("is false on division-by-zero error", () => {
    const prev = runEvents([
      { type: "digit", digit: "1" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "0" },
    ]);
    const event: CalculatorEvent = { type: "equals" };
    const next = reduce(prev, event);

    expect(next.state).toBe("Error");
    expect(shouldPersistCompleted(prev, event, next)).toBe(false);
  });

  it("is true on repeated equals with new result", () => {
    const afterFirst = runEvents([
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "equals" },
    ]);
    const event: CalculatorEvent = { type: "equals" };
    const next = reduce(afterFirst, event);

    expect(next.display).toBe("11");
    expect(shouldPersistCompleted(afterFirst, event, next)).toBe(true);
  });
});

describe("integration: equals → History Service → CalculationRepository", () => {
  it("persists after successful calculation", async () => {
    const inserted: Array<{ expression: string; result: string }> = [];
    const repo: CalculationRepository = {
      insert: vi.fn(async (expression, result) => {
        inserted.push({ expression, result });
      }),
      list: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    const service = createHistoryService(repo);

    let ctx = initialContext();
    const events: CalculatorEvent[] = [
      { type: "digit", digit: "4" },
      { type: "digit", digit: "2" },
      { type: "digit", digit: "7" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "digit", digit: "7" },
      { type: "digit", digit: "9" },
      { type: "equals" },
    ];

    for (const event of events) {
      const next = reduce(ctx, event);
      if (shouldPersistCompleted(ctx, event, next)) {
        await service.persistCompleted(next.expression, next.display);
      }
      ctx = next;
    }

    expect(ctx.display).toBe("806");
    expect(ctx.expression).toBe("427+379");
    expect(inserted).toEqual([{ expression: "427+379", result: "806" }]);
  });

  it("keeps UI result when repository fails", async () => {
    const repo: CalculationRepository = {
      insert: vi.fn().mockRejectedValue(new Error("db down")),
      list: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    const service = createHistoryService(repo);
    vi.spyOn(console, "error").mockImplementation(() => {});

    let ctx = initialContext();
    for (const event of [
      { type: "digit", digit: "2" } as CalculatorEvent,
      { type: "operator", op: "+" } as CalculatorEvent,
      { type: "digit", digit: "2" } as CalculatorEvent,
      { type: "equals" } as CalculatorEvent,
    ]) {
      const next = reduce(ctx, event);
      if (shouldPersistCompleted(ctx, event, next)) {
        await service.persistCompleted(next.expression, next.display);
      }
      ctx = next;
    }

    expect(ctx.state).toBe("Result");
    expect(ctx.display).toBe("4");
    expect(ctx.expression).toBe("2+2");
  });
});

describe("integration: web IndexedDB persistence failure", () => {
  it("History Service keeps calculation when IndexedDB adapter fails", async () => {
    const { IndexedDbCalculationRepository } = await import(
      "./IndexedDbCalculationRepository"
    );
    const repo = new IndexedDbCalculationRepository();
    vi.spyOn(repo, "insert").mockRejectedValue(new Error("idb open failed"));
    const service = createHistoryService(repo);
    vi.spyOn(console, "error").mockImplementation(() => {});

    let ctx = initialContext();
    for (const event of [
      { type: "digit", digit: "5" } as CalculatorEvent,
      { type: "operator", op: "+" } as CalculatorEvent,
      { type: "equals" } as CalculatorEvent,
    ]) {
      const next = reduce(ctx, event);
      if (shouldPersistCompleted(ctx, event, next)) {
        await service.persistCompleted(next.expression, next.display);
      }
      ctx = next;
    }

    expect(ctx.state).toBe("Result");
    expect(ctx.display).toBe("10");
    expect(ctx.expression).toBe("5+5");
  });
});
