import { runDataSourceContract } from '@/test/data-source-contract';

import { createMockDataSource, type KeyValueStorage } from '../mock/mock-data-source';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
  };
}

// Cenários comuns a qualquer implementação (ver src/test/data-source-contract.ts).
runDataSourceContract('mock', () => createMockDataSource({ storage: memoryStorage(), latencyMs: 0 }));

// Comportamento específico do mock: persistência no KeyValueStorage.
describe('mock data source', () => {
  it('persiste no storage e restaura a sessão ao reabrir', async () => {
    const storage = memoryStorage();
    const ds = createMockDataSource({ storage, latencyMs: 0 });
    await ds.auth.signUp({ name: 'Lucas', email: 'lucas@ex.com', password: '123456' });
    await ds.activities.create({ title: 'Viagem', date: '2025-01-01' });

    const reopened = createMockDataSource({ storage, latencyMs: 0 });
    expect((await reopened.auth.getSession())?.user.name).toBe('Lucas');
    expect((await reopened.activities.list()).map((a) => a.title)).toEqual(['Viagem']);
  });
});
