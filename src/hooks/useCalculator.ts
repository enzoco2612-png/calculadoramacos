import { useCallback, useRef, useState } from "react";
import {
  initialContext,
  reduce,
  type CalculatorContext,
  type CalculatorEvent,
} from "../calculator";
import {
  historyService,
  shouldPersistCompleted,
  type PersistCompleted,
} from "../history";

export function useCalculator(persist: PersistCompleted = historyService.persistCompleted) {
  const [ctx, setCtx] = useState<CalculatorContext>(initialContext);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const dispatch = useCallback(
    (event: CalculatorEvent) => {
      const prev = ctxRef.current;
      const next = reduce(prev, event);
      ctxRef.current = next;
      setCtx(next);
      // Persist outside setState so React StrictMode does not double-insert.
      if (shouldPersistCompleted(prev, event, next)) {
        void persist(next.expression, next.display).catch(() => {
          // History Service already swallows; guard custom injectors too.
        });
      }
    },
    [persist],
  );

  return { ctx, dispatch };
}
