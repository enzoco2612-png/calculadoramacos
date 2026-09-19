/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalculatorWindow } from "../components/CalculatorWindow";

describe("CalculatorWindow UI smoke", () => {
  it("renders display expression and result", () => {
    render(
      <CalculatorWindow
        expression="427+379"
        display="806"
        onEvent={() => {}}
      />,
    );

    expect(screen.getByText("427+379")).toBeTruthy();
    expect(screen.getByTestId("result").textContent).toBe("806");
  });

  it("renders keypad keys", () => {
    render(
      <CalculatorWindow expression="" display="0" onEvent={() => {}} />,
    );

    expect(screen.getByLabelText("Teclado")).toBeTruthy();
    expect(screen.getByLabelText("All Clear")).toBeTruthy();
    expect(screen.getByLabelText("Igual")).toBeTruthy();
    expect(screen.getByLabelText("7")).toBeTruthy();
    expect(screen.getByLabelText("Vírgula decimal")).toBeTruthy();
  });

  it("keeps Convert and Keypad Mode disabled", () => {
    render(
      <CalculatorWindow expression="" display="0" onEvent={vi.fn()} />,
    );

    expect(screen.getByLabelText("Convert")).toBeDisabled();
    expect(screen.getByLabelText("Keypad Mode")).toBeDisabled();
  });
});
