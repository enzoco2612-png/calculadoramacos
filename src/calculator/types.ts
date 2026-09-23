/** Calculator domain types — SPEC §5 + Memory Controls V2 */

export type CalculatorState = "Input" | "OpReady" | "Result" | "Error";

export type Operator = "+" | "-" | "×" | "÷";

export type CalculatorEvent =
  | { type: "digit"; digit: string }
  | { type: "decimal" }
  | { type: "operator"; op: Operator }
  | { type: "equals" }
  | { type: "clear" }
  | { type: "backspace" }
  | { type: "percent" }
  | { type: "sign" }
  | { type: "memoryAdd" }
  | { type: "memorySubtract" }
  | { type: "memoryRecall" };

export interface CalculatorContext {
  state: CalculatorState;
  /** Formatted display string (comma decimal, or "Erro") */
  display: string;
  /** Expression line (upper display) */
  expression: string;
  /** Accumulated left operand (number) when op is pending / after result */
  acc: number | null;
  /** Pending binary operator */
  op: Operator | null;
  /**
   * Last right operand for `=` repetition.
   * When `lastBPercent` is true, this is the percentage rate (e.g. 15 for 15%),
   * not the already-converted decimal/absolute contribution.
   */
  lastB: number | null;
  /** When true, `lastB` is a % rate and must be reapplied with contextual % semantics */
  lastBPercent: boolean;
  /**
   * Transient rate after pressing `%` with a pending operator (before `=`).
   * Editing/display may already show the converted operand.
   */
  percentRate: number | null;
  /** Raw editing buffer for the current operand (uses `,` as decimal) */
  editing: string | null;
  /**
   * Session memory register (Memory Controls V2).
   * Not persisted. Only `initialContext()` sets this to 0; helpers must pass it through.
   */
  memoryValue: number;
}

export type CalcResult =
  | { ok: true; value: number }
  | { ok: false; error: "div_by_zero" | "overflow" };
