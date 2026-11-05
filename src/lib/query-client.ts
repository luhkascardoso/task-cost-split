import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * Chaves de cache centralizadas. Toda query/mutation usa estas fábricas
 * para que as invalidações sejam previsíveis (ver docs/01-arquitetura.md).
 */
export const queryKeys = {
  activities: {
    all: ['activities'] as const,
    detail: (id: string) => ['activities', id] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    byActivity: (activityId: string) => ['expenses', 'activity', activityId] as const,
    detail: (id: string) => ['expenses', id] as const,
  },
  participants: {
    all: ['participants'] as const,
  },
  summary: ['summary'] as const,
};
