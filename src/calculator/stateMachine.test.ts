import { describe, expect, it } from "vitest";
import { reduce, run, initialContext } from "./stateMachine";
import type { CalculatorEvent } from "./types";

function seq(...events: CalculatorEvent[]) {
  return run(events);
}

describe("State Machine — acceptance flows", () => {
  it("427 + 379 = 806", () => {
    const ctx = seq(
      { type: "digit", digit: "4" },
      { type: "digit", digit: "2" },
      { type: "digit", digit: "7" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "digit", digit: "7" },
      { type: "digit", digit: "9" },
      { type: "equals" },
    );
    expect(ctx.state).toBe("Result");
    expect(ctx.display).toBe("806");
    expect(ctx.expression).toBe("427+379");
  });

  it("10 − 3 = 7", () => {
    const ctx = seq(
      { type: "digit", digit: "1" },
      { type: "digit", digit: "0" },
      { type: "operator", op: "-" },
      { type: "digit", digit: "3" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("7");
    expect(ctx.expression).toBe("10-3");
  });

  it("5 × 5 = 25", () => {
    const ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "×" },
      { type: "digit", digit: "5" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("25");
    expect(ctx.expression).toBe("5×5");
  });

  it("10 ÷ 2 = 5", () => {
    const ctx = seq(
      { type: "digit", digit: "1" },
      { type: "digit", digit: "0" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "2" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("5");
    expect(ctx.expression).toBe("10÷2");
  });

  it("0,1 + 0,2 = 0,3", () => {
    const ctx = seq(
      { type: "digit", digit: "0" },
      { type: "decimal" },
      { type: "digit", digit: "1" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "0" },
      { type: "decimal" },
      { type: "digit", digit: "2" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("0,3");
  });

  it("division by zero → Error", () => {
    const ctx = seq(
      { type: "digit", digit: "1" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "0" },
      { type: "equals" },
    );
    expect(ctx.state).toBe("Error");
    expect(ctx.display).toBe("Erro");
  });
});

describe("State Machine — operators & equals", () => {
  it("= in OpReady uses b = acc", () => {
    const ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "equals" },
    );
    expect(ctx.state).toBe("Result");
    expect(ctx.display).toBe("10");
    expect(ctx.expression).toBe("5+5");
  });

  it("operator swap before second operand", () => {
    let ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
    );
    expect(ctx.state).toBe("OpReady");
    expect(ctx.expression).toBe("5+");
    expect(ctx.display).toBe("5");

    ctx = reduce(ctx, { type: "operator", op: "-" });
    expect(ctx.state).toBe("OpReady");
    expect(ctx.expression).toBe("5-");
    expect(ctx.display).toBe("5");

    ctx = reduce(ctx, { type: "digit", digit: "3" });
    ctx = reduce(ctx, { type: "equals" });
    expect(ctx.display).toBe("2");
    expect(ctx.expression).toBe("5-3");
  });

  it("chained operations: 5 + 3 + → 8+", () => {
    const ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "operator", op: "+" },
    );
    expect(ctx.state).toBe("OpReady");
    expect(ctx.display).toBe("8");
    expect(ctx.expression).toBe("8+");
  });

  it("repeated =", () => {
    let ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("8");

    ctx = reduce(ctx, { type: "equals" });
    expect(ctx.display).toBe("11");

    ctx = reduce(ctx, { type: "equals" });
    expect(ctx.display).toBe("14");
  });

  it("new digit after result starts fresh Input", () => {
    let ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "equals" },
    );
    ctx = reduce(ctx, { type: "digit", digit: "9" });
    expect(ctx.state).toBe("Input");
    expect(ctx.display).toBe("9");
    expect(ctx.expression).toBe("");
    expect(ctx.op).toBeNull();
    expect(ctx.lastB).toBeNull();
  });

  it("operator after result uses result as a", () => {
    let ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "equals" },
    );
    ctx = reduce(ctx, { type: "operator", op: "×" });
    expect(ctx.state).toBe("OpReady");
    expect(ctx.display).toBe("8");
    expect(ctx.expression).toBe("8×");
    expect(ctx.acc).toBe(8);
  });
});

describe("State Machine — controls", () => {
  it("AC clears everything", () => {
    let ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
    );
    ctx = reduce(ctx, { type: "clear" });
    expect(ctx).toEqual(initialContext());
  });

  it("backspace on b in Input", () => {
    let ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "digit", digit: "7" },
      { type: "digit", digit: "9" },
    );
    ctx = reduce(ctx, { type: "backspace" });
    expect(ctx.state).toBe("Input");
    expect(ctx.display).toBe("37");
  });

  it("backspace traverses 8+8 -> 8+ -> 8 -> 0", () => {
    let ctx = seq(
      { type: "digit", digit: "8" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "8" },
    );

    ctx = reduce(ctx, { type: "backspace" });
    expect(ctx.state).toBe("OpReady");
    expect(ctx.display).toBe("8");
    expect(ctx.expression).toBe("8+");
    expect(ctx.op).toBe("+");

    ctx = reduce(ctx, { type: "backspace" });
    expect(ctx.state).toBe("Input");
    expect(ctx.display).toBe("8");
    expect(ctx.expression).toBe("");
    expect(ctx.op).toBeNull();

    ctx = reduce(ctx, { type: "backspace" });
    expect(ctx.display).toBe("0");
  });

  it("+/− toggles sign", () => {
    let ctx = seq({ type: "digit", digit: "5" });
    ctx = reduce(ctx, { type: "sign" });
    expect(ctx.display).toBe("-5");
  });

  it("% on operand", () => {
    let ctx = seq(
      { type: "digit", digit: "5" },
      { type: "digit", digit: "0" },
    );
    ctx = reduce(ctx, { type: "percent" });
    expect(ctx.display).toBe("0,5");
  });

  it("% on Result clears lastB", () => {
    let ctx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "equals" },
    );
    expect(ctx.lastB).toBe(3);
    ctx = reduce(ctx, { type: "percent" });
    expect(ctx.state).toBe("Result");
    expect(ctx.display).toBe("0,08");
    expect(ctx.op).toBeNull();
    expect(ctx.lastB).toBeNull();
    expect(ctx.lastBPercent).toBe(false);
  });
});

describe("State Machine — contextual percent", () => {
  it("100 + 15 % = 115", () => {
    const ctx = seq(
      { type: "digit", digit: "1" },
      { type: "digit", digit: "0" },
      { type: "digit", digit: "0" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "1" },
      { type: "digit", digit: "5" },
      { type: "percent" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("115");
    expect(ctx.expression).toBe("100+15");
    expect(ctx.lastB).toBe(15);
    expect(ctx.lastBPercent).toBe(true);
  });

  it("100 - 15 % = 85", () => {
    const ctx = seq(
      { type: "digit", digit: "1" },
      { type: "digit", digit: "0" },
      { type: "digit", digit: "0" },
      { type: "operator", op: "-" },
      { type: "digit", digit: "1" },
      { type: "digit", digit: "5" },
      { type: "percent" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("85");
    expect(ctx.expression).toBe("100-15");
  });

  it("100 × 15 % = 15", () => {
    const ctx = seq(
      { type: "digit", digit: "1" },
      { type: "digit", digit: "0" },
      { type: "digit", digit: "0" },
      { type: "operator", op: "×" },
      { type: "digit", digit: "1" },
      { type: "digit", digit: "5" },
      { type: "percent" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("15");
    expect(ctx.expression).toBe("100×0,15");
  });

  it("100 ÷ 25 % = 400", () => {
    const ctx = seq(
      { type: "digit", digit: "1" },
      { type: "digit", digit: "0" },
      { type: "digit", digit: "0" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "2" },
      { type: "digit", digit: "5" },
      { type: "percent" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("400");
    expect(ctx.expression).toBe("100÷0,25");
  });

  it("50 % = 0,5 (unary)", () => {
    const ctx = seq(
      { type: "digit", digit: "5" },
      { type: "digit", digit: "0" },
      { type: "percent" },
    );
    expect(ctx.display).toBe("0,5");
  });

  it("100 + 15 % = 115 then 150 = 172,5 (preserves +15%)", () => {
    let ctx = seq(
      { type: "digit", digit: "1" },
      { type: "digit", digit: "0" },
      { type: "digit", digit: "0" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "1" },
      { type: "digit", digit: "5" },
      { type: "percent" },
      { type: "equals" },
    );
    expect(ctx.display).toBe("115");

    ctx = reduce(ctx, { type: "digit", digit: "1" });
    ctx = reduce(ctx, { type: "digit", digit: "5" });
    ctx = reduce(ctx, { type: "digit", digit: "0" });
    expect(ctx.display).toBe("150");
    expect(ctx.op).toBe("+");
    expect(ctx.lastB).toBe(15);
    expect(ctx.lastBPercent).toBe(true);

    ctx = reduce(ctx, { type: "equals" });
    expect(ctx.display).toBe("172,5");
    expect(ctx.expression).toBe("150+22,5");
  });

  it("normal ops without % still work", () => {
    const addCtx = seq(
      { type: "digit", digit: "4" },
      { type: "digit", digit: "2" },
      { type: "digit", digit: "7" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "digit", digit: "7" },
      { type: "digit", digit: "9" },
      { type: "equals" },
    );
    expect(addCtx.display).toBe("806");
    expect(addCtx.lastBPercent).toBe(false);

    const mulCtx = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "×" },
      { type: "digit", digit: "5" },
      { type: "equals" },
    );
    expect(mulCtx.display).toBe("25");

    let repeat = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "equals" },
    );
    repeat = reduce(repeat, { type: "equals" });
    expect(repeat.display).toBe("11");

    let fresh = seq(
      { type: "digit", digit: "5" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
      { type: "equals" },
    );
    fresh = reduce(fresh, { type: "digit", digit: "9" });
    expect(fresh.op).toBeNull();
    expect(fresh.lastB).toBeNull();
    expect(fresh.display).toBe("9");
  });
});

describe("State Machine — Error exit", () => {
  it("digit exits Error into Input", () => {
    let ctx = seq(
      { type: "digit", digit: "1" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "0" },
      { type: "equals" },
    );
    expect(ctx.state).toBe("Error");
    ctx = reduce(ctx, { type: "digit", digit: "7" });
    expect(ctx.state).toBe("Input");
    expect(ctx.display).toBe("7");
    expect(ctx.op).toBeNull();
    expect(ctx.lastB).toBeNull();
  });

  it("AC exits Error", () => {
    let ctx = seq(
      { type: "digit", digit: "1" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "0" },
      { type: "equals" },
      { type: "clear" },
    );
    expect(ctx).toEqual(initialContext());
  });

  it("operator is no-op in Error", () => {
    let ctx = seq(
      { type: "digit", digit: "1" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "0" },
      { type: "equals" },
    );
    const before = { ...ctx };
    ctx = reduce(ctx, { type: "operator", op: "+" });
    expect(ctx).toEqual(before);
  });
});
