/** Calculator state machine — SPEC §1–5. Calls engine for ⊕ and %. */

import {
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
  };
}

function withEditing(editing: string, rest: Partial<CalculatorContext> = {}): CalculatorContext {
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
  };
}

function opReadyContext(acc: number, op: Operator): CalculatorContext {
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

export function reduce(
  ctx: CalculatorContext,
  event: CalculatorEvent,
): CalculatorContext {
  switch (event.type) {
    case "clear":
      return initialContext();

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

    default:
      return ctx;
  }
}

function onDigit(ctx: CalculatorContext, digit: string): CalculatorContext {
  if (ctx.state === "Error") {
    return withEditing(appendDigit("0", digit));
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
      };
    }
    return withEditing(appendDigit("0", digit));
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
    return withEditing(appendDecimal("0"));
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
      };
    }
    return withEditing(appendDecimal("0"));
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
  if (ctx.state !== "Input") return ctx;
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
    return opReadyContext(acc, ctx.op!);
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
    return opReadyContext(result.value, ctx.op!);
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
    return opReadyContext(ctx.acc!, op);
  }

  if (ctx.state === "Result") {
    return opReadyContext(ctx.acc ?? 0, op);
  }

  // Input: new left operand after %-result (acc null, lastB preserved)
  if (ctx.acc == null && ctx.op != null && ctx.lastB != null && ctx.editing != null) {
    const a = parseOperand(ctx.editing);
    return opReadyContext(a, op);
  }

  // Input
  if (ctx.op != null && ctx.acc != null && ctx.editing != null) {
    // Chain: compute a ⊕ b, then pending new op
    const b = parseOperand(ctx.editing);
    const applied = applyBinary(ctx.acc, ctx.op, b, ctx.percentRate);
    if (!applied.ok) {
      return errorContext(applied.expression, ctx);
    }
    return opReadyContext(applied.value, op);
  }

  // First operand only
  const a = parseOperand(ctx.editing ?? "0");
  return opReadyContext(a, op);
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
      return resultContext(a, ctx.op, converted.value, result.value, {
        lastBPercent: true,
        lastB: ctx.lastB,
      });
    }
    const b = ctx.lastB;
    const result = applyOperator(a, ctx.op, b);
    if (!result.ok) {
      return errorContext(formatExpression(a, ctx.op, b), ctx);
    }
    return resultContext(a, ctx.op, b, result.value);
  }

  if (ctx.state === "OpReady") {
    // macOS style: b = acc
    const a = ctx.acc!;
    const b = a;
    const result = applyOperator(a, ctx.op!, b);
    if (!result.ok) {
      return errorContext(formatExpression(a, ctx.op!, b), ctx);
    }
    return resultContext(a, ctx.op!, b, result.value);
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
    return resultContext(a, ctx.op, converted.value, result.value, {
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
    return resultContext(a, ctx.op, applied.shownB, applied.value, {
      lastBPercent: applied.lastBPercent,
      lastB: applied.lastB,
    });
  }

  return ctx;
}

/** Dispatch a sequence of events from a clean initial context. */
export function run(events: CalculatorEvent[]): CalculatorContext {
  return events.reduce(reduce, initialContext());
}
