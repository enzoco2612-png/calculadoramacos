import { useEffect } from "react";
import type { CalculatorEvent } from "../calculator";
import { mapKeyToEvent } from "./mapKeyToEvent";

export function useKeyboard(dispatch: (event: CalculatorEvent) => void): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const event = mapKeyToEvent(e.key);
      if (!event) return;

      e.preventDefault();
      dispatch(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);
}
