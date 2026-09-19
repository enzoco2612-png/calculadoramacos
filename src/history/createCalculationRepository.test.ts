import { afterEach, describe, expect, it } from "vitest";
import { createCalculationRepository } from "./createCalculationRepository";
import { IndexedDbCalculationRepository } from "./IndexedDbCalculationRepository";
import { TauriSqliteCalculationRepository } from "./TauriSqliteCalculationRepository";

describe("createCalculationRepository", () => {
  afterEach(() => {
    delete (globalThis as { isTauri?: boolean }).isTauri;
  });

  it("selects IndexedDB in browser", () => {
    delete (globalThis as { isTauri?: boolean }).isTauri;
    const repo = createCalculationRepository();
    expect(repo).toBeInstanceOf(IndexedDbCalculationRepository);
  });

  it("selects SQLite adapter in Tauri", () => {
    (globalThis as { isTauri?: boolean }).isTauri = true;
    const repo = createCalculationRepository();
    expect(repo).toBeInstanceOf(TauriSqliteCalculationRepository);
  });
});
