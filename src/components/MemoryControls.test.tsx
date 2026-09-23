/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalculatorWindow } from "../components/CalculatorWindow";
import { MemoryControls } from "../components/MemoryControls";

describe("MemoryControls UI", () => {
  it("renders m+, m-, mr labels", () => {
    render(<MemoryControls onEvent={() => {}} />);

    expect(screen.getByLabelText("Memory Controls")).toBeTruthy();
    expect(screen.getByText("m+")).toBeTruthy();
    expect(screen.getByText("m-")).toBeTruthy();
    expect(screen.getByText("mr")).toBeTruthy();
  });

  it("dispatches memoryAdd / memorySubtract / memoryRecall on click", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(<MemoryControls onEvent={onEvent} />);

    await user.click(screen.getByLabelText("Memory Add"));
    await user.click(screen.getByLabelText("Memory Subtract"));
    await user.click(screen.getByLabelText("Memory Recall"));

    expect(onEvent).toHaveBeenNthCalledWith(1, { type: "memoryAdd" });
    expect(onEvent).toHaveBeenNthCalledWith(2, { type: "memorySubtract" });
    expect(onEvent).toHaveBeenNthCalledWith(3, { type: "memoryRecall" });
  });
});

describe("CalculatorWindow UI smoke — Memory Controls", () => {
  it("renders Display, Memory Controls, and Keypad in order", () => {
    const { container } = render(
      <CalculatorWindow expression="" display="0" onEvent={() => {}} />,
    );

    expect(screen.getByLabelText("Display")).toBeTruthy();
    expect(screen.getByLabelText("Memory Controls")).toBeTruthy();
    expect(screen.getByLabelText("Teclado")).toBeTruthy();

    const root = container.querySelector(".calculator-window");
    expect(root).toBeTruthy();
    const children = Array.from(root!.children).map(
      (el) => el.getAttribute("aria-label") ?? el.className,
    );
    const displayIdx = children.findIndex((c) => c === "Display");
    const memoryIdx = children.findIndex((c) => c === "Memory Controls");
    const keypadIdx = children.findIndex((c) => c === "Teclado");
    expect(displayIdx).toBeGreaterThanOrEqual(0);
    expect(memoryIdx).toBeGreaterThan(displayIdx);
    expect(keypadIdx).toBeGreaterThan(memoryIdx);
  });
});
