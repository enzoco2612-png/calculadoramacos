/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCalculator } from "./useCalculator";

describe("useCalculator persistence", () => {
  it("persists once per successful equals (no StrictMode double-insert)", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCalculator(persist));

    act(() => {
      result.current.dispatch({ type: "digit", digit: "5" });
      result.current.dispatch({ type: "operator", op: "+" });
      result.current.dispatch({ type: "digit", digit: "5" });
      result.current.dispatch({ type: "equals" });
    });

    expect(result.current.ctx.display).toBe("10");
    expect(result.current.ctx.expression).toBe("5+5");
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith("5+5", "10");
  });

  it("keeps result when persist rejects", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useCalculator(persist));

    act(() => {
      result.current.dispatch({ type: "digit", digit: "1" });
      result.current.dispatch({ type: "operator", op: "+" });
      result.current.dispatch({ type: "digit", digit: "1" });
      result.current.dispatch({ type: "equals" });
    });

    expect(result.current.ctx.display).toBe("2");
    expect(persist).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(result.current.ctx.display).toBe("2");
  });
});
