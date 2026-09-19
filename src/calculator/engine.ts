/** Pure calculation engine — independent of React and SQLite. No eval(). */

import type { CalcResult, Operator } from "./types";

const MAX_DIGITS = 12;
const MAX_ABS = 1e12;

/** Half away from zero on `digits` significant figures (SPEC §4). */
export function roundToSignificant(n: number, digits = MAX_DIGITS): number {
  if (!Number.isFinite(n)) return n;
  if (n === 0) return 0;

  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const order = Math.floor(Math.log10(abs));
  const factor = 10 ** (digits - 1 - order);
  const scaled = abs * factor;
  const roundedScaled = Math.floor(scaled + 0.5);
  const result = sign * (roundedScaled / factor);
  return result === 0 ? 0 : result;
}

/** Count digits in a display/editing string (excludes sign and comma). */
export function digitCount(text: string): number {
  return text.replace(/^-/, "").replace(/,/g, "").length;
}

/** Parse operand string with `,` decimal separator into a number. */
export function parseOperand(text: string): number {
  if (text === "" || text === "-" || text === "," || text === "-,") return 0;
  const normalized = text.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return NaN;
  return Object.is(n, -0) ? 0 : n;
}

/**
 * Format a number for display: comma decimal, no trailing zeros,
 * integers without comma, no scientific notation. `-0` → `0`.
 */
export function formatDisplay(n: number): string {
  if (!Number.isFinite(n)) return "Erro";
  const rounded = roundToSignificant(n);
  if (rounded === 0) return "0";

  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const order = Math.floor(Math.log10(abs));
  const factor = 10 ** (MAX_DIGITS - 1 - order);
  const scaled = Math.floor(abs * factor + 0.5);
  let intStr = String(scaled);

  if (order < 0) {
    // 0,xxx… — pad leading zeros after decimal
    const zerosAfterComma = -order - 1;
    const frac = "0".repeat(zerosAfterComma) + intStr;
    let body = "0," + frac;
    body = body.replace(/0+$/, "");
    if (body.endsWith(",")) body = body.slice(0, -1);
    return sign + body;
  }

  const intDigits = order + 1;
  if (intStr.length < intDigits) {
    intStr = intStr.padStart(intDigits, "0");
  }

  let body: string;
  if (intStr.length === intDigits) {
    body = intStr;
  } else {
    const intPart = intStr.slice(0, intDigits);
    let fracPart = intStr.slice(intDigits);
    fracPart = fracPart.replace(/0+$/, "");
    body = fracPart.length > 0 ? `${intPart},${fracPart}` : intPart;
  }

  return sign + body;
}

function finalize(raw: number): CalcResult {
  if (!Number.isFinite(raw)) {
    return { ok: false, error: "overflow" };
  }
  const value = roundToSignificant(raw);
  if (!Number.isFinite(value) || Math.abs(value) >= MAX_ABS) {
    return { ok: false, error: "overflow" };
  }
  if (digitCount(formatDisplay(value)) > MAX_DIGITS) {
    return { ok: false, error: "overflow" };
  }
  return { ok: true, value: value === 0 ? 0 : value };
}

export function add(a: number, b: number): CalcResult {
  return finalize(a + b);
}

export function sub(a: number, b: number): CalcResult {
  return finalize(a - b);
}

export function mul(a: number, b: number): CalcResult {
  return finalize(a * b);
}

export function div(a: number, b: number): CalcResult {
  if (b === 0) return { ok: false, error: "div_by_zero" };
  return finalize(a / b);
}

export function applyOperator(a: number, op: Operator, b: number): CalcResult {
  switch (op) {
    case "+":
      return add(a, b);
    case "-":
      return sub(a, b);
    case "×":
      return mul(a, b);
    case "÷":
      return div(a, b);
  }
}

/** Unary percent (no pending operator): `n / 100`. */
export function percent(n: number): CalcResult {
  return finalize(n / 100);
}

/**
 * Convert right operand `b` as a percentage rate given pending operator (macOS-style).
 * - `+` / `-` → `a × b / 100` (percent of left operand)
 * - `×` / `÷` → `b / 100`
 */
export function percentOperand(a: number, op: Operator, b: number): CalcResult {
  if (op === "+" || op === "-") {
    return finalize((a * b) / 100);
  }
  return finalize(b / 100);
}

/** Binary op where `rate` is a percentage (preserves % on `=` repeat). */
export function applyOperatorWithPercent(
  a: number,
  op: Operator,
  rate: number,
): CalcResult {
  const converted = percentOperand(a, op, rate);
  if (!converted.ok) return converted;
  return applyOperator(a, op, converted.value);
}

/** Negate; `-0` normalizes to `0`. */
export function negate(n: number): number {
  if (n === 0) return 0;
  return -n;
}

/** Append a digit to an editing buffer (leading-zero collapse, 12-digit cap). */
export function appendDigit(editing: string, digit: string): string {
  if (!/^[0-9]$/.test(digit)) return editing;

  const neg = editing.startsWith("-");
  let body = neg ? editing.slice(1) : editing;

  if (body.includes(",")) {
    if (digitCount(editing) >= MAX_DIGITS) return editing;
    body += digit;
  } else if (body === "" || /^0+$/.test(body)) {
    // Leading zeros collapse to a single 0 until a non-zero digit
    body = digit;
  } else {
    if (digitCount(editing) >= MAX_DIGITS) return editing;
    body += digit;
  }

  return (neg ? "-" : "") + body;
}

/** Insert decimal separator; at most one per operand. Empty/`0` → `0,`. */
export function appendDecimal(editing: string): string {
  const neg = editing.startsWith("-");
  let body = neg ? editing.slice(1) : editing;

  if (body.includes(",")) return editing;
  if (body === "" || body === "0") body = "0,";
  else body += ",";

  return (neg ? "-" : "") + body;
}

/** Toggle sign of an editing buffer string. */
export function negateEditing(editing: string): string {
  if (editing === "0" || editing === "0," || editing === "") return editing;
  if (editing.startsWith("-")) return editing.slice(1);
  return "-" + editing;
}

export function operatorSymbol(op: Operator): string {
  return op;
}

/** Build expression fragment: `a`, `a+`, or `a+b` with formatted operands. */
export function formatExpression(
  a: number,
  op?: Operator | null,
  b?: number | null,
): string {
  const left = formatDisplay(a);
  if (op == null) return left;
  const mid = left + operatorSymbol(op);
  if (b == null) return mid;
  return mid + formatDisplay(b);
}

export { MAX_DIGITS, MAX_ABS };
