/** Factory: Tauri → SQLite, browser → IndexedDB. */

import type { CalculationRepository } from "./CalculationRepository";
import { isTauriRuntime } from "./env";
import { IndexedDbCalculationRepository } from "./IndexedDbCalculationRepository";
import { TauriSqliteCalculationRepository } from "./TauriSqliteCalculationRepository";

export function createCalculationRepository(): CalculationRepository {
  if (isTauriRuntime()) {
    return new TauriSqliteCalculationRepository();
  }
  return new IndexedDbCalculationRepository();
}
