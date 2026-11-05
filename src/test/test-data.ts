import { createMockDataSource, type KeyValueStorage } from '@/data/mock/mock-data-source';
import type { DataSource } from '@/data/types';

/** Storage em memória — cada reset começa com o "banco" vazio. */
function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
  };
}

let current: DataSource = createMockDataSource({ storage: memoryStorage(), latencyMs: 0 });

/** Recria a fonte de dados (chamado no beforeEach global do jest.setup.ts). */
export function resetTestData(): DataSource {
  current = createMockDataSource({ storage: memoryStorage(), latencyMs: 0 });
  return current;
}

/**
 * Referência estável usada no lugar de `data` (via jest.mock('@/data') no jest.setup.ts).
 * O app importa `data` uma vez; o Proxy delega para a instância atual, que muda a cada teste.
 */
export const testData = new Proxy({} as DataSource, {
  get: (_target, key) => current[key as keyof DataSource],
});
