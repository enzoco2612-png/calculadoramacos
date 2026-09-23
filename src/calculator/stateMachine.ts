/** Calculator state machine — SPEC §1–5 + Memory Controls V2. Calls engine for ⊕, %, memory. */

import {
  add,
  appendDecimal,
  appendDigit,
  applyOperator,
  formatDisplay,
  formatExpression,
  negate,
  negateEditing,
  parseOperand,
  percent,
  percentOperand,
  sub,
} from "./engine";
import type { CalculatorContext, CalculatorEvent, Operator } from "./types";

export function initialContext(): CalculatorContext {
  return {
    state: "Input",
    display: "0",
    expression: "",
    acc: null,
    op: null,
    lastB: null,
    lastBPercent: false,
    percentRate: null,
    editing: "0",
    memoryValue: 0,
  };
}

function withEditing(
  editing: string,
  memoryValue: number,
  rest: Omit<Partial<CalculatorContext>, "memoryValue"> = {},
): CalculatorContext {
  return {
    state: "Input",
    display: editing,
    expression: "",
    acc: null,
    op: null,
    lastB: null,
    lastBPercent: false,
    percentRate: null,
    editing,
    ...rest,
    // Always last: rest is typed without memoryValue and cannot override it.
    memoryValue,
  };
}

function errorContext(
  expression: string,
  base: CalculatorContext,
): CalculatorContext {
  return {
    ...base,
    state: "Error",
    display: "Erro",
    expression,
  };
}

function resultContext(
  a: number,
  op: Operator,
  b: number,
  value: number,
  memoryValue: number,
  opts: { lastBPercent?: boolean; lastB?: number } = {},
): CalculatorContext {
  const lastBPercent = opts.lastBPercent ?? false;
  return {
    state: "Result",
    display: formatDisplay(value),
    expression: formatExpression(a, op, b),
    acc: value,
    op,
    lastB: opts.lastB ?? b,
    lastBPercent,
    percentRate: null,
    editing: null,
    memoryValue,
  };
}

function opReadyContext(
  acc: number,
  op: Operator,
  memoryValue: number,
): CalculatorContext {
  return {
    state: "OpReady",
    display: formatDisplay(acc),
    expression: formatExpression(acc, op),
    acc,
    op,
    lastB: null,
    lastBPercent: false,
    percentRate: null,
    editing: null,
    memoryValue,
  };
}

function backspaceEditing(editing: string): string {
  if (editing.length <= 1) return "0";
  if (editing.length === 2 && editing.startsWith("-")) return "0";
  const next = editing.slice(0, -1);
  if (next === "-" || next === "") return "0";
  return next;
}

function applyBinary(
  a: number,
  op: Operator,
  b: number,
  percentRate: number | null,
):
  | { ok: true; value: number; shownB: number; lastB: number; lastBPercent: boolean }
  | { ok: false; expression: string } {
  if (percentRate != null) {
    const converted = percentOperand(a, op, percentRate);
    if (!converted.ok) {
      return { ok: false, expression: formatExpression(a, op, percentRate) };
    }
    const result = applyOperator(a, op, converted.value);
    if (!result.ok) {
      return { ok: false, expression: formatExpression(a, op, converted.value) };
    }
    return {
      ok: true,
      value: result.value,
      shownB: converted.value,
      lastB: percentRate,
      lastBPercent: true,
    };
  }

  const result = applyOperator(a, op, b);
  if (!result.ok) {
    return { ok: false, expression: formatExpression(a, op, b) };
  }
  return {
    ok: true,
    value: result.value,
    shownB: b,
    lastB: b,
    lastBPercent: false,
  };
}

/** Numeric value currently shown (for m+ / m-). Error → null. */
function currentDisplayValue(ctx: CalculatorContext): number | null {
  if (ctx.state === "Error") return null;
  if (ctx.state === "Input" && ctx.editing != null) {
    return parseOperand(ctx.editing);
  }
  return parseOperand(ctx.display);
}

export function reduce(
  ctx: CalculatorContext,
  event: CalculatorEvent,
): CalculatorContext {
  switch (event.type) {
    case "clear":
      return { ...initialContext(), memoryValue: ctx.memoryValue };

    case "digit":
      return onDigit(ctx, event.digit);

    case "decimal":
      return onDecimal(ctx);

    case "backspace":
      return onBackspace(ctx);

    case "sign":
      return onSign(ctx);

    case "percent":
      return onPercent(ctx);

    case "operator":
      return onOperator(ctx, event.op);

    case "equals":
      return onEquals(ctx);

    case "memoryAdd":
      return onMemoryAdd(ctx);

    case "memorySubtract":
      return onMemorySubtract(ctx);

    case "memoryRecall":
      return onMemoryRecall(ctx);

    default:
      return ctx;
  }
}

function onDigit(ctx: CalculatorContext, digit: string): CalculatorContext {
  if (ctx.state === "Error") {
    return withEditing(appendDigit("0", digit), ctx.memoryValue);
  }

  if (ctx.state === "Result") {
    // After a %-based result, keep op/lastB so a new number + `=` reapplies A⊕B%.
    if (ctx.lastBPercent && ctx.op != null && ctx.lastB != null) {
      const editing = appendDigit("0", digit);
      return {
        state: "Input",
        display: editing,
        expression: "",
        acc: null,
        op: ctx.op,
        lastB: ctx.lastB,
        lastBPercent: true,
        percentRate: null,
        editing,
        memoryValue: ctx.memoryValue,
      };
    }
    return withEditing(appendDigit("0", digit), ctx.memoryValue);
  }

  if (ctx.state === "OpReady") {
    const editing = appendDigit("0", digit);
    return {
      state: "Input",
      display: editing,
      expression: formatExpression(ctx.acc!, ctx.op!),
      acc: ctx.acc,
      op: ctx.op,
      lastB: null,
      lastBPercent: false,
      percentRate: null,
      editing,
      memoryValue: ctx.memoryValue,
    };
  }

  // Input — editing clears a prior % conversion on `b`
  const editing = appendDigit(ctx.editing ?? "0", digit);
  return {
    ...ctx,
    state: "Input",
    display: editing,
    editing,
    percentRate: null,
    expression:
      ctx.op != null && ctx.acc != null
        ? formatExpression(ctx.acc, ctx.op)
        : "",
  };
}

function onDecimal(ctx: CalculatorContext): CalculatorContext {
  if (ctx.state === "Error") {
    return withEditing(appendDecimal("0"), ctx.memoryValue);
  }

  if (ctx.state === "Result") {
    if (ctx.lastBPercent && ctx.op != null && ctx.lastB != null) {
      const editing = appendDecimal("0");
      return {
        state: "Input",
        display: editing,
        expression: "",
        acc: null,
        op: ctx.op,
        lastB: ctx.lastB,
        lastBPercent: true,
        percentRate: null,
        editing,
        memoryValue: ctx.memoryValue,
      };
    }
    return withEditing(appendDecimal("0"), ctx.memoryValue);
  }

  if (ctx.state === "OpReady") {
    const editing = appendDecimal("0");
    return {
      state: "Input",
      display: editing,
      expression: formatExpression(ctx.acc!, ctx.op!),
      acc: ctx.acc,
      op: ctx.op,
      lastB: null,
      lastBPercent: false,
      percentRate: null,
      editing,
      memoryValue: ctx.memoryValue,
    };
  }

  const editing = appendDecimal(ctx.editing ?? "0");
  return {
    ...ctx,
    state: "Input",
    display: editing,
    editing,
    percentRate: null,
    expression:
      ctx.op != null && ctx.acc != null
        ? formatExpression(ctx.acc, ctx.op)
        : "",
  };
}

function onBackspace(ctx: CalculatorContext): CalculatorContext {
  if (ctx.state === "OpReady") {
    const editing = formatDisplay(ctx.acc ?? 0);
    return {
      state: "Input",
      display: editing,
      expression: "",
      acc: null,
      op: null,
      lastB: null,
      lastBPercent: false,
      percentRate: null,
      editing,
      memoryValue: ctx.memoryValue,
    };
  }

  if (ctx.state !== "Input") return ctx;

  // If the right operand has only one digit left, Backspace removes that
  // operand entirely and returns to the pending-operator state. A subsequent
  // Backspace can then remove the operator, and another can edit the left operand.
  if (
    ctx.op != null &&
    ctx.acc != null &&
    ctx.editing != null &&
    (ctx.editing.length === 1 ||
      (ctx.editing.startsWith("-") && ctx.editing.length === 2))
  ) {
    return opReadyContext(ctx.acc, ctx.op, ctx.memoryValue);
  }

  const editing = backspaceEditing(ctx.editing ?? "0");
  return {
    ...ctx,
    display: editing,
    editing,
    percentRate: null,
    expression:
      ctx.op != null && ctx.acc != null
        ? formatExpression(ctx.acc, ctx.op)
        : "",
  };
}

function onSign(ctx: CalculatorContext): CalculatorContext {
  if (ctx.state === "Error") return ctx;

  if (ctx.state === "OpReady") {
    const acc = negate(ctx.acc ?? 0);
    return opReadyContext(acc, ctx.op!, ctx.memoryValue);
  }

  if (ctx.state === "Result") {
    const value = negate(ctx.acc ?? 0);
    return {
      ...ctx,
      display: formatDisplay(value),
      acc: value,
      // keep op/lastB for = repeat? SPEC: "+/− inverts the value on display
      // (current operand or result)". Doesn't say to clear lastB.
    };
  }

  // Input
  const editing = negateEditing(ctx.editing ?? "0");
  return {
    ...ctx,
    display: editing,
    editing,
  };
}

function onPercent(ctx: CalculatorContext): CalculatorContext {
  if (ctx.state === "Error") return ctx;

  if (ctx.state === "OpReady") {
    const result = percent(ctx.acc ?? 0);
    if (!result.ok) {
      return errorContext(ctx.expression, ctx);
    }
    return opReadyContext(result.value, ctx.op!, ctx.memoryValue);
  }

  if (ctx.state === "Result") {
    const result = percent(ctx.acc ?? 0);
    if (!result.ok) {
      return errorContext(ctx.expression, ctx);
    }
    return {
      state: "Result",
      display: formatDisplay(result.value),
      expression: ctx.expression,
      acc: result.value,
      op: null,
      lastB: null,
      lastBPercent: false,
      percentRate: null,
      editing: null,
      memoryValue: ctx.memoryValue,
    };
  }

  // Input with pending operator: contextual % (macOS-style)
  if (ctx.op != null && ctx.acc != null && ctx.editing != null) {
    const rate = parseOperand(ctx.editing);
    const converted = percentOperand(ctx.acc, ctx.op, rate);
    if (!converted.ok) {
      return errorContext(formatExpression(ctx.acc, ctx.op), ctx);
    }
    const editing = formatDisplay(converted.value);
    return {
      ...ctx,
      state: "Input",
      display: editing,
      editing,
      percentRate: rate,
    };
  }

  // Input without operator: unary n → n/100
  const n = parseOperand(ctx.editing ?? "0");
  const result = percent(n);
  if (!result.ok) {
    return errorContext("", ctx);
  }
  const editing = formatDisplay(result.value);
  return {
    ...ctx,
    state: "Input",
    display: editing,
    editing,
    percentRate: null,
  };
}

function onOperator(ctx: CalculatorContext, op: Operator): CalculatorContext {
  if (ctx.state === "Error") return ctx;

  if (ctx.state === "OpReady") {
    return opReadyContext(ctx.acc!, op, ctx.memoryValue);
  }

  if (ctx.state === "Result") {
    return opReadyContext(ctx.acc ?? 0, op, ctx.memoryValue);
  }

  // Input: new left operand after %-result (acc null, lastB preserved)
  if (ctx.acc == null && ctx.op != null && ctx.lastB != null && ctx.editing != null) {
    const a = parseOperand(ctx.editing);
    return opReadyContext(a, op, ctx.memoryValue);
  }

  // Input
  if (ctx.op != null && ctx.acc != null && ctx.editing != null) {
    // Chain: compute a ⊕ b, then pending new op
    const b = parseOperand(ctx.editing);
    const applied = applyBinary(ctx.acc, ctx.op, b, ctx.percentRate);
    if (!applied.ok) {
      return errorContext(applied.expression, ctx);
    }
    return opReadyContext(applied.value, op, ctx.memoryValue);
  }

  // First operand only
  const a = parseOperand(ctx.editing ?? "0");
  return opReadyContext(a, op, ctx.memoryValue);
}

function onEquals(ctx: CalculatorContext): CalculatorContext {
  if (ctx.state === "Error") return ctx;

  if (ctx.state === "Input" && ctx.op == null) {
    return ctx;
  }

  if (ctx.state === "Result") {
    if (ctx.op == null || ctx.lastB == null || ctx.acc == null) return ctx;
    const a = ctx.acc;
    if (ctx.lastBPercent) {
      const converted = percentOperand(a, ctx.op, ctx.lastB);
      if (!converted.ok) {
        return errorContext(formatExpression(a, ctx.op, ctx.lastB), ctx);
      }
      const result = applyOperator(a, ctx.op, converted.value);
      if (!result.ok) {
        return errorContext(formatExpression(a, ctx.op, converted.value), ctx);
      }
      return resultContext(a, ctx.op, converted.value, result.value, ctx.memoryValue, {
        lastBPercent: true,
        lastB: ctx.lastB,
      });
    }
    const b = ctx.lastB;
    const result = applyOperator(a, ctx.op, b);
    if (!result.ok) {
      return errorContext(formatExpression(a, ctx.op, b), ctx);
    }
    return resultContext(a, ctx.op, b, result.value, ctx.memoryValue);
  }

  if (ctx.state === "OpReady") {
    // macOS style: b = acc
    const a = ctx.acc!;
    const b = a;
    const result = applyOperator(a, ctx.op!, b);
    if (!result.ok) {
      return errorContext(formatExpression(a, ctx.op!, b), ctx);
    }
    return resultContext(a, ctx.op!, b, result.value, ctx.memoryValue);
  }

  // Input: new left after %-result — reapply preserved A⊕B%
  if (
    ctx.acc == null &&
    ctx.op != null &&
    ctx.lastB != null &&
    ctx.lastBPercent &&
    ctx.editing != null
  ) {
    const a = parseOperand(ctx.editing);
    const converted = percentOperand(a, ctx.op, ctx.lastB);
    if (!converted.ok) {
      return errorContext(formatExpression(a, ctx.op, ctx.lastB), ctx);
    }
    const result = applyOperator(a, ctx.op, converted.value);
    if (!result.ok) {
      return errorContext(formatExpression(a, ctx.op, converted.value), ctx);
    }
    return resultContext(a, ctx.op, converted.value, result.value, ctx.memoryValue, {
      lastBPercent: true,
      lastB: ctx.lastB,
    });
  }

  // Input with op and b
  if (ctx.op != null && ctx.acc != null && ctx.editing != null) {
    const a = ctx.acc;
    const b = parseOperand(ctx.editing);
    const applied = applyBinary(a, ctx.op, b, ctx.percentRate);
    if (!applied.ok) {
      return errorContext(applied.expression, ctx);
    }
    return resultContext(a, ctx.op, applied.shownB, applied.value, ctx.memoryValue, {
      lastBPercent: applied.lastBPercent,
      lastB: applied.lastB,
    });
  }

  return ctx;
}

function onMemoryAdd(ctx: CalculatorContext): CalculatorContext {
  const current = currentDisplayValue(ctx);
  if (current == null) return ctx;
  const result = add(ctx.memoryValue, current);
  if (!result.ok) return ctx;
  return { ...ctx, memoryValue: result.value };
}

function onMemorySubtract(ctx: CalculatorContext): CalculatorContext {
  const current = currentDisplayValue(ctx);
  if (current == null) return ctx;
  const result = sub(ctx.memoryValue, current);
  if (!result.ok) return ctx;
  return { ...ctx, memoryValue: result.value };
}

function onMemoryRecall(ctx: CalculatorContext): CalculatorContext {
  const text = formatDisplay(ctx.memoryValue);

  if (ctx.state === "Error") {
    return withEditing(text, ctx.memoryValue);
  }

  if (ctx.state === "Result") {
    return withEditing(text, ctx.memoryValue);
  }

  if (ctx.state === "OpReady") {
    return {
      state: "Input",
      display: text,
      expression: formatExpression(ctx.acc!, ctx.op!),
      acc: ctx.acc,
      op: ctx.op,
      lastB: null,
      lastBPercent: false,
      percentRate: null,
      editing: text,
      memoryValue: ctx.memoryValue,
    };
  }

  // Input — replace current operand (with or without pending op)
  return {
    ...ctx,
    state: "Input",
    display: text,
    editing: text,
    percentRate: null,
    expression:
      ctx.op != null && ctx.acc != null
        ? formatExpression(ctx.acc, ctx.op)
        : "",
  };
}

/** Dispatch a sequence of events from a clean initial context. */
export function run(events: CalculatorEvent[]): CalculatorContext {
  return events.reduce(reduce, initialContext());
}
