/** Common persistence contract for calculation history (SPEC §6–7). */

export interface CalculationRecord {
  id: number;
  expression: string;
  result: string;
  created_at: string;
}

export interface CalculationRepository {
  insert(expression: string, result: string): Promise<void>;
  list(): Promise<CalculationRecord[]>;
  clear(): Promise<void>;
}
