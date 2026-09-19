/** Helpers to decide when a successful `=` should be persisted. */

import type { CalculatorContext, CalculatorEvent } from "../calculator";

/**
 * True when `equals` produced a new successful Result that should enter history.
 */
export function shouldPersistCompleted(
  prev: CalculatorContext,
  event: CalculatorEvent,
  next: CalculatorContext,
): boolean {
  if (event.type !== "equals") return false;
  if (next.state !== "Result") return false;
  if (!next.expression) return false;

  return (
    prev.state !== "Result" ||
    prev.expression !== next.expression ||
    prev.display !== next.display ||
    prev.acc !== next.acc
  );
}
