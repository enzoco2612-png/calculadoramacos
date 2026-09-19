import { describe, expect, it } from "vitest";
import {
  add,
  appendDecimal,
  appendDigit,
  applyOperator,
  applyOperatorWithPercent,
  div,
  formatDisplay,
  mul,
  negate,
  percent,
  percentOperand,
  roundToSignificant,
  sub,
} from "./engine";

describe("Calculation Engine — binary ops", () => {
  it("adds", () => {
    expect(add(427, 379)).toEqual({ ok: true, value: 806 });
  });

  it("subtracts", () => {
    expect(sub(10, 3)).toEqual({ ok: true, value: 7 });
  });

  it("multiplies", () => {
    expect(mul(5, 5)).toEqual({ ok: true, value: 25 });
  });

  it("divides", () => {
    expect(div(10, 2)).toEqual({ ok: true, value: 5 });
  });

  it("0,1 + 0,2 → 0,3 after rounding", () => {
    const result = add(0.1, 0.2);
    expect(result).toEqual({ ok: true, value: 0.3 });
    if (result.ok) {
      expect(formatDisplay(result.value)).toBe("0,3");
    }
  });

  it("division by zero", () => {
    expect(div(1, 0)).toEqual({ ok: false, error: "div_by_zero" });
    expect(applyOperator(1, "÷", 0)).toEqual({
      ok: false,
      error: "div_by_zero",
    });
  });

  it("overflow when abs >= 10^12", () => {
    expect(add(1e12 - 1, 1)).toEqual({ ok: false, error: "overflow" });
    expect(mul(1e11, 100)).toEqual({ ok: false, error: "overflow" });
  });
});

describe("Calculation Engine — percent & negate", () => {
  it("percent unary: 50 → 0,5", () => {
    const result = percent(50);
    expect(result).toEqual({ ok: true, value: 0.5 });
    if (result.ok) expect(formatDisplay(result.value)).toBe("0,5");
  });

  it("percentOperand: +/− uses a×b/100; ×÷ uses b/100", () => {
    expect(percentOperand(100, "+", 15)).toEqual({ ok: true, value: 15 });
    expect(percentOperand(100, "-", 15)).toEqual({ ok: true, value: 15 });
    expect(percentOperand(100, "×", 15)).toEqual({ ok: true, value: 0.15 });
    expect(percentOperand(100, "÷", 25)).toEqual({ ok: true, value: 0.25 });
  });

  it("applyOperatorWithPercent preserves rate semantics", () => {
    expect(applyOperatorWithPercent(100, "+", 15)).toEqual({
      ok: true,
      value: 115,
    });
    expect(applyOperatorWithPercent(100, "-", 15)).toEqual({
      ok: true,
      value: 85,
    });
    expect(applyOperatorWithPercent(100, "×", 15)).toEqual({
      ok: true,
      value: 15,
    });
    expect(applyOperatorWithPercent(100, "÷", 25)).toEqual({
      ok: true,
      value: 400,
    });
    expect(applyOperatorWithPercent(150, "+", 15)).toEqual({
      ok: true,
      value: 172.5,
    });
  });

  it("negate", () => {
    expect(negate(5)).toBe(-5);
    expect(negate(-5)).toBe(5);
    expect(negate(0)).toBe(0);
  });
});

describe("Calculation Engine — round & format", () => {
  it("round half away from zero at significant digits", () => {
    expect(roundToSignificant(1.25, 2)).toBe(1.3);
    expect(roundToSignificant(-1.25, 2)).toBe(-1.3);
  });

  it("formatDisplay uses comma and strips trailing zeros", () => {
    expect(formatDisplay(806)).toBe("806");
    expect(formatDisplay(1.5)).toBe("1,5");
    expect(formatDisplay(0.3)).toBe("0,3");
    expect(formatDisplay(-5)).toBe("-5");
    expect(formatDisplay(0)).toBe("0");
  });

  it("appendDigit collapses leading zeros and caps at 12 digits", () => {
    expect(appendDigit("0", "0")).toBe("0");
    expect(appendDigit("0", "7")).toBe("7");
    expect(appendDigit("000", "7")).toBe("7");
    const twelve = "123456789012";
    expect(appendDigit(twelve, "3")).toBe(twelve);
    expect(appendDigit("0,10", "0")).toBe("0,100");
  });

  it("appendDecimal", () => {
    expect(appendDecimal("0")).toBe("0,");
    expect(appendDecimal("5")).toBe("5,");
    expect(appendDecimal("5,")).toBe("5,");
    expect(appendDecimal("5,1")).toBe("5,1");
  });
});
