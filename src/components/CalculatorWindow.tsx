import { Display } from "./Display";
import { Keypad } from "./Keypad";
import { MemoryControls } from "./MemoryControls";
import { WindowControls } from "./WindowControls";
import type { CalculatorEvent } from "../calculator";

interface CalculatorWindowProps {
  expression: string;
  display: string;
  onEvent: (event: CalculatorEvent) => void;
}

export function CalculatorWindow({
  expression,
  display,
  onEvent,
}: CalculatorWindowProps) {
  return (
    <div className="calculator-window" role="application" aria-label="Calculadora">
      <header className="top-controls" data-tauri-drag-region>
        <WindowControls />
        <div className="utility-controls">
          <button
            type="button"
            className="utility-btn"
            aria-label="Convert"
            disabled
            title="Convert (indisponível)"
          />
          <button
            type="button"
            className="utility-btn"
            aria-label="Keypad Mode"
            disabled
            title="Keypad Mode (indisponível)"
          />
        </div>
      </header>

      <Display expression={expression} result={display} />
      <MemoryControls onEvent={onEvent} />
      <Keypad onEvent={onEvent} />
    </div>
  );
}
