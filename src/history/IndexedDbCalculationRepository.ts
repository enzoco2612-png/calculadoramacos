/** Browser adapter: IndexedDB local store (SPEC §6–7). */

import type {
  CalculationRecord,
  CalculationRepository,
} from "./CalculationRepository";

const DB_NAME = "calculadora-mac";
const STORE_NAME = "calculations";
const DB_VERSION = 1;

type StoredCalculation = {
  id?: number;
  expression: string;
  result: string;
  created_at: string;
};

function requireIndexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB unavailable");
  }
  return indexedDB;
}

function openDb(): Promise<IDBDatabase> {
  const factory = requireIndexedDb();
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        Promise.resolve(run(store))
          .then((value) => {
            tx.oncomplete = () => {
              db.close();
              resolve(value);
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error ?? new Error("IndexedDB transaction failed"));
            };
          })
          .catch((err) => {
            db.close();
            reject(err);
          });
      }),
  );
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function nowIsoUtc(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export class IndexedDbCalculationRepository implements CalculationRepository {
  async insert(expression: string, result: string): Promise<void> {
    const record: StoredCalculation = {
      expression,
      result,
      created_at: nowIsoUtc(),
    };
    await withStore("readwrite", (store) => requestToPromise(store.add(record)));
  }

  async list(): Promise<CalculationRecord[]> {
    const rows = await withStore("readonly", (store) =>
      requestToPromise(store.getAll() as IDBRequest<StoredCalculation[]>),
    );
    return rows
      .filter((row): row is StoredCalculation & { id: number } => row.id != null)
      .map((row) => ({
        id: row.id,
        expression: row.expression,
        result: row.result,
        created_at: row.created_at,
      }))
      .sort((a, b) => {
        const byDate = b.created_at.localeCompare(a.created_at);
        return byDate !== 0 ? byDate : b.id - a.id;
      });
  }

  async clear(): Promise<void> {
    await withStore("readwrite", (store) => requestToPromise(store.clear()));
  }
}
