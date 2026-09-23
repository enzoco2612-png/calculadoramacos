import { describe, expect, it } from "vitest";
import { reduce, run, initialContext } from "./stateMachine";
import type { CalculatorContext, CalculatorEvent } from "./types";

function seq(...events: CalculatorEvent[]) {
  return run(events);
}

function digits(n: string): CalculatorEvent[] {
  return n.split("").map((digit) => ({ type: "digit" as const, digit }));
}

/** Store 8 in memory and return that context. */
function withMemory8(): CalculatorContext {
  return seq({ type: "digit", digit: "8" }, { type: "memoryAdd" });
}

describe("Memory Controls V2", () => {
  it("1. memoryValue starts at 0", () => {
    expect(initialContext().memoryValue).toBe(0);
  });

  it("2. 8 m+ → memoryValue = 8", () => {
    const ctx = withMemory8();
    expect(ctx.memoryValue).toBe(8);
    expect(ctx.display).toBe("8");
  });

  it("3. 8 m+ AC 2 m+ → memoryValue = 10", () => {
    const ctx = seq(
      { type: "digit", digit: "8" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "2" },
      { type: "memoryAdd" },
    );
    expect(ctx.memoryValue).toBe(10);
  });

  it("4. 10 m+ AC 4 m- → memoryValue = 6", () => {
    const ctx = seq(
      ...digits("10"),
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "4" },
      { type: "memorySubtract" },
    );
    expect(ctx.memoryValue).toBe(6);
  });

  it("5. 5 m- → memoryValue = -5", () => {
    const ctx = seq({ type: "digit", digit: "5" }, { type: "memorySubtract" });
    expect(ctx.memoryValue).toBe(-5);
  });

  it("6. 1,5 m+ AC 2,25 m+ → memoryValue = 3,75", () => {
    const ctx = seq(
      { type: "digit", digit: "1" },
      { type: "decimal" },
      { type: "digit", digit: "5" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "2" },
      { type: "decimal" },
      { type: "digit", digit: "2" },
      { type: "digit", digit: "5" },
      { type: "memoryAdd" },
    );
    expect(ctx.memoryValue).toBe(3.75);
  });

  it("7. m+ does not change display", () => {
    let ctx = seq(...digits("42"));
    const before = ctx.display;
    ctx = reduce(ctx, { type: "memoryAdd" });
    expect(ctx.display).toBe(before);
  });

  it("8. m- does not change display", () => {
    let ctx = seq(...digits("42"));
    const before = ctx.display;
    ctx = reduce(ctx, { type: "memorySubtract" });
    expect(ctx.display).toBe(before);
  });

  it("9. m+ does not change expression", () => {
    let ctx = seq(
      { type: "digit", digit: "8" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
    );
    const before = ctx.expression;
    ctx = reduce(ctx, { type: "memoryAdd" });
    expect(ctx.expression).toBe(before);
  });

  it("10. m- does not change expression", () => {
    let ctx = seq(
      { type: "digit", digit: "8" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "3" },
    );
    const before = ctx.expression;
    ctx = reduce(ctx, { type: "memorySubtract" });
    expect(ctx.expression).toBe(before);
  });

  it("11. AC preserves memoryValue", () => {
    const ctx = seq(
      { type: "digit", digit: "8" },
      { type: "memoryAdd" },
      { type: "clear" },
    );
    expect(ctx.memoryValue).toBe(8);
    expect(ctx.display).toBe("0");
    expect(ctx.state).toBe("Input");
    expect(ctx.expression).toBe("");
  });

  it("12. mr after AC recalls memory", () => {
    const ctx = seq(
      { type: "digit", digit: "8" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "memoryRecall" },
    );
    expect(ctx.display).toBe("8");
    expect(ctx.editing).toBe("8");
    expect(ctx.memoryValue).toBe(8);
  });

  it("13. mr in Input replaces current operand", () => {
    const ctx = seq(
      { type: "digit", digit: "8" },
      { type: "memoryAdd" },
      { type: "clear" },
      ...digits("123"),
      { type: "memoryRecall" },
    );
    expect(ctx.display).toBe("8");
    expect(ctx.editing).toBe("8");
    expect(ctx.state).toBe("Input");
    expect(ctx.op).toBeNull();
  });

  it("14. mr in OpReady starts operand B", () => {
    const ctx = seq(
      { type: "digit", digit: "5" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "8" },
      { type: "operator", op: "+" },
      { type: "memoryRecall" },
    );
    expect(ctx.state).toBe("Input");
    expect(ctx.acc).toBe(8);
    expect(ctx.op).toBe("+");
    expect(ctx.display).toBe("5");
    expect(ctx.editing).toBe("5");
    expect(ctx.expression).toBe("8+");
  });

  it("15. mr while editing B replaces B only", () => {
    const ctx = seq(
      { type: "digit", digit: "5" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "8" },
      { type: "operator", op: "+" },
      ...digits("123"),
      { type: "memoryRecall" },
    );
    expect(ctx.state).toBe("Input");
    expect(ctx.acc).toBe(8);
    expect(ctx.op).toBe("+");
    expect(ctx.display).toBe("5");
    expect(ctx.editing).toBe("5");
    expect(ctx.expression).toBe("8+");
  });

  it("16. mr after Result starts fresh Input", () => {
    const ctx = seq(
      { type: "digit", digit: "7" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "8" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "2" },
      { type: "equals" },
      { type: "memoryRecall" },
    );
    expect(ctx.state).toBe("Input");
    expect(ctx.display).toBe("7");
    expect(ctx.editing).toBe("7");
    expect(ctx.expression).toBe("");
    expect(ctx.acc).toBeNull();
    expect(ctx.op).toBeNull();
    expect(ctx.lastB).toBeNull();
    expect(ctx.lastBPercent).toBe(false);
    expect(ctx.percentRate).toBeNull();
  });

  it("17. mr in Error recovers to Input", () => {
    const ctx = seq(
      { type: "digit", digit: "5" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "1" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "0" },
      { type: "equals" },
      { type: "memoryRecall" },
    );
    expect(ctx.state).toBe("Input");
    expect(ctx.display).toBe("5");
    expect(ctx.editing).toBe("5");
    expect(ctx.expression).toBe("");
  });

  it("18. mr with memoryValue 0 works", () => {
    const ctx = seq(...digits("123"), { type: "memoryRecall" });
    expect(ctx.display).toBe("0");
    expect(ctx.editing).toBe("0");
    expect(ctx.memoryValue).toBe(0);
  });

  it("19. memoryAdd in Error is no-op", () => {
    let ctx = seq(
      { type: "digit", digit: "3" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "1" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "0" },
      { type: "equals" },
    );
    expect(ctx.state).toBe("Error");
    const before = { ...ctx };
    ctx = reduce(ctx, { type: "memoryAdd" });
    expect(ctx).toEqual(before);
  });

  it("20. memorySubtract in Error is no-op", () => {
    let ctx = seq(
      { type: "digit", digit: "3" },
      { type: "memoryAdd" },
      { type: "clear" },
      { type: "digit", digit: "1" },
      { type: "operator", op: "÷" },
      { type: "digit", digit: "0" },
      { type: "equals" },
    );
    const before = { ...ctx };
    ctx = reduce(ctx, { type: "memorySubtract" });
    expect(ctx).toEqual(before);
  });

  it("21. overflow on memoryAdd keeps prior memoryValue", () => {
    let ctx = seq(...digits("999999999999"), { type: "memoryAdd" });
    expect(ctx.memoryValue).toBe(999999999999);
    ctx = reduce(ctx, { type: "clear" });
    for (const e of digits("1")) ctx = reduce(ctx, e);
    ctx = reduce(ctx, { type: "memoryAdd" });
    expect(ctx.memoryValue).toBe(999999999999);
    expect(ctx.display).toBe("1");
    expect(ctx.state).not.toBe("Error");
  });

  it("22. overflow on memorySubtract keeps prior memoryValue", () => {
    let ctx = seq(...digits("999999999999"), { type: "memorySubtract" });
    expect(ctx.memoryValue).toBe(-999999999999);
    ctx = reduce(ctx, { type: "clear" });
    for (const e of digits("1")) ctx = reduce(ctx, e);
    const displayBefore = ctx.display;
    ctx = reduce(ctx, { type: "memorySubtract" });
    expect(ctx.memoryValue).toBe(-999999999999);
    expect(ctx.display).toBe(displayBefore);
    expect(ctx.state).not.toBe("Error");
  });

  it("23. mr clears percentRate when replacing operand", () => {
    let ctx = seq(
      { type: "digit", digit: "9" },
      { type: "memoryAdd" },
      { type: "clear" },
      ...digits("100"),
      { type: "operator", op: "+" },
      ...digits("15"),
      { type: "percent" },
    );
    expect(ctx.percentRate).toBe(15);
    ctx = reduce(ctx, { type: "memoryRecall" });
    expect(ctx.percentRate).toBeNull();
    expect(ctx.display).toBe("9");
    expect(ctx.editing).toBe("9");
    expect(ctx.acc).toBe(100);
    expect(ctx.op).toBe("+");
  });

  it("24. memory ops do not behave like equals", () => {
    let ctx = seq(
      { type: "digit", digit: "8" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "2" },
    );
    ctx = reduce(ctx, { type: "memoryAdd" });
    expect(ctx.state).toBe("Input");
    expect(ctx.display).toBe("2");
    expect(ctx.expression).toBe("8+");
    expect(ctx.acc).toBe(8);
    expect(ctx.op).toBe("+");

    ctx = reduce(ctx, { type: "memorySubtract" });
    expect(ctx.state).toBe("Input");
    expect(ctx.expression).toBe("8+");

    ctx = reduce(ctx, { type: "memoryRecall" });
    expect(ctx.state).toBe("Input");
    // recall replaces B with memory (8+2 then m+ stored 2; after m- mem=0; mr → 0)
    expect(ctx.state).not.toBe("Result");
  });
});

describe("Memory Controls V2 — propagation through normal transitions", () => {
  it("preserves memoryValue across operator", () => {
    let ctx = withMemory8();
    ctx = reduce(ctx, { type: "operator", op: "+" });
    expect(ctx.memoryValue).toBe(8);
    expect(ctx.state).toBe("OpReady");
  });

  it("preserves memoryValue across equals", () => {
    let ctx = withMemory8();
    ctx = reduce(ctx, { type: "operator", op: "+" });
    ctx = reduce(ctx, { type: "digit", digit: "1" });
    ctx = reduce(ctx, { type: "equals" });
    expect(ctx.memoryValue).toBe(8);
    expect(ctx.state).toBe("Result");
    expect(ctx.display).toBe("9");
  });

  it("preserves memoryValue across Backspace", () => {
    let ctx = seq(
      { type: "digit", digit: "8" },
      { type: "memoryAdd" },
      { type: "operator", op: "+" },
      { type: "digit", digit: "8" },
    );
    ctx = reduce(ctx, { type: "backspace" });
    expect(ctx.memoryValue).toBe(8);
    expect(ctx.expression).toBe("8+");
    ctx = reduce(ctx, { type: "backspace" });
    expect(ctx.memoryValue).toBe(8);
    ctx = reduce(ctx, { type: "backspace" });
    expect(ctx.memoryValue).toBe(8);
  });

  it("preserves memoryValue across percent", () => {
    let ctx = seq(...digits("50"), { type: "memoryAdd" });
    expect(ctx.memoryValue).toBe(50);
    ctx = reduce(ctx, { type: "percent" });
    expect(ctx.memoryValue).toBe(50);
    expect(ctx.display).toBe("0,5");
  });

  it("preserves memoryValue across sign", () => {
    let ctx = withMemory8();
    ctx = reduce(ctx, { type: "sign" });
    expect(ctx.memoryValue).toBe(8);
    expect(ctx.display).toBe("-8");
  });

  it("preserves memoryValue across decimal", () => {
    let ctx = withMemory8();
    ctx = reduce(ctx, { type: "clear" });
    expect(ctx.memoryValue).toBe(8);
    ctx = reduce(ctx, { type: "digit", digit: "1" });
    ctx = reduce(ctx, { type: "decimal" });
    expect(ctx.memoryValue).toBe(8);
    expect(ctx.display).toBe("1,");
  });

  it("mr still recalls 8 after mixed transitions", () => {
    let ctx = withMemory8();
    ctx = reduce(ctx, { type: "operator", op: "+" });
    ctx = reduce(ctx, { type: "digit", digit: "2" });
    ctx = reduce(ctx, { type: "equals" });
    ctx = reduce(ctx, { type: "clear" });
    ctx = reduce(ctx, { type: "memoryRecall" });
    expect(ctx.display).toBe("8");
    expect(ctx.memoryValue).toBe(8);
  });
});
