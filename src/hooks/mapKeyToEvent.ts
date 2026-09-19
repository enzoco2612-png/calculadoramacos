import type { CalculatorEvent, Operator } from "../calculator";

/** Map a physical keyboard key to a calculator event (SPEC §8). */
export function mapKeyToEvent(key: string): CalculatorEvent | null {
  if (key >= "0" && key <= "9") {
    return { type: "digit", digit: key };
  }

  switch (key) {
    case "+":
      return { type: "operator", op: "+" satisfies Operator };
    case "-":
      return { type: "operator", op: "-" };
    case "*":
      return { type: "operator", op: "×" };
    case "/":
      return { type: "operator", op: "÷" };
    case "Enter":
    case "=":
      return { type: "equals" };
    case "Backspace":
      return { type: "backspace" };
    case "Escape":
      return { type: "clear" };
    case ",":
    case ".":
      return { type: "decimal" };
    case "%":
      return { type: "percent" };
    default:
      return null;
  }
}
