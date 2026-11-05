import { queryClient } from '@/lib/query-client';
import { useSessionStore } from '@/features/auth/session-store';
import { resetTestData } from '@/test/test-data';

// 1) Toda a app usa a fonte de dados mock em memória, sem latência.
jest.mock('@/data', () => ({
  ...jest.requireActual('@/data/types'),
  data: jest.requireActual('@/test/test-data').testData,
}));

// 2) Sem retries (erros aparecem na hora) e sem timers de garbage collection
//    do cache (evitam o aviso "worker process has failed to exit gracefully").
queryClient.setDefaultOptions({
  queries: { retry: false, gcTime: Infinity },
  mutations: { retry: false },
});

// 3) Estado limpo antes de cada teste: "banco", cache do React Query e sessão.
beforeEach(() => {
  resetTestData();
  queryClient.clear();
  useSessionStore.setState({ session: null, initialized: true });
});

afterAll(() => {
  queryClient.clear();
});
