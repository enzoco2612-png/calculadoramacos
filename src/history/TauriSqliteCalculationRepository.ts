/** Desktop adapter: SQLite via Tauri IPC (SPEC §6–7). */

import { invoke } from "@tauri-apps/api/core";
import type {
  CalculationRecord,
  CalculationRepository,
} from "./CalculationRepository";

export class TauriSqliteCalculationRepository implements CalculationRepository {
  async insert(expression: string, result: string): Promise<void> {
    await invoke<number>("history_insert", { expression, result });
  }

  async list(): Promise<CalculationRecord[]> {
    return invoke<CalculationRecord[]>("history_list");
  }

  async clear(): Promise<void> {
    await invoke("history_clear");
  }
}
