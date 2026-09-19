import { describe, expect, it } from "vitest";
import { mapKeyToEvent } from "./mapKeyToEvent";

describe("mapKeyToEvent (SPEC §8)", () => {
  it("maps digits 0–9", () => {
    for (let i = 0; i <= 9; i++) {
      const key = String(i);
      expect(mapKeyToEvent(key)).toEqual({ type: "digit", digit: key });
    }
  });

  it("maps operators", () => {
    expect(mapKeyToEvent("+")).toEqual({ type: "operator", op: "+" });
    expect(mapKeyToEvent("-")).toEqual({ type: "operator", op: "-" });
    expect(mapKeyToEvent("*")).toEqual({ type: "operator", op: "×" });
    expect(mapKeyToEvent("/")).toEqual({ type: "operator", op: "÷" });
  });

  it("maps equals via Enter and =", () => {
    expect(mapKeyToEvent("Enter")).toEqual({ type: "equals" });
    expect(mapKeyToEvent("=")).toEqual({ type: "equals" });
  });

  it("maps Backspace and Escape", () => {
    expect(mapKeyToEvent("Backspace")).toEqual({ type: "backspace" });
    expect(mapKeyToEvent("Escape")).toEqual({ type: "clear" });
  });

  it("maps comma and period as decimal", () => {
    expect(mapKeyToEvent(",")).toEqual({ type: "decimal" });
    expect(mapKeyToEvent(".")).toEqual({ type: "decimal" });
  });

  it("maps percent", () => {
    expect(mapKeyToEvent("%")).toEqual({ type: "percent" });
  });

  it("returns null for unmapped keys", () => {
    expect(mapKeyToEvent("a")).toBeNull();
    expect(mapKeyToEvent("F1")).toBeNull();
  });
});
