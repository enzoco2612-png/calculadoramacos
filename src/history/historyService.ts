/**
 * History Service — persists completed calculations after successful `=` (SPEC §6–7).
 * Depends only on CalculationRepository. Swallows failures so UI/calc never block.
 */

import type { CalculationRepository } from "./CalculationRepository";
import { createCalculationRepository } from "./createCalculationRepository";

export type PersistCompleted = (
  expression: string,
  result: string,
) => Promise<void>;

export function createHistoryService(
  repo: CalculationRepository = createCalculationRepository(),
): { persistCompleted: PersistCompleted } {
  return {
    async persistCompleted(expression: string, result: string): Promise<void> {
      try {
        await repo.insert(expression, result);
      } catch (err) {
        // SPEC §7: log internally; result stays on screen; no crash
        console.error("[history] persist failed:", err);
      }
    },
  };
}

export const historyService = createHistoryService();
