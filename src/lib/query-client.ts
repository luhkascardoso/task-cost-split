import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

import { isRecoverableError } from '@/data/errors';

/** Tentativas extras de uma leitura que falhou por motivo transitório. */
export const MAX_QUERY_RETRIES = 2;

/** Leituras: só repete falha transitória (rede, timeout, servidor). Erro de negócio não muda tentando de novo. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return isRecoverableError(error) && failureCount < MAX_QUERY_RETRIES;
}

/**
 * Opções de produção do QueryClient.
 * Nos testes o singleton recebe override (`retry: false`) em `jest.setup.ts`;
 * a política real fica aqui para ser exercida e auditada sem depender do client mutado.
 */
export const queryClientDefaultOptions = {
  queries: {
    staleTime: 30_000,
    retry: shouldRetryQuery,
  },
  mutations: {
    // Escrita NUNCA é repetida automaticamente: criar despesa ou marcar "Pago" duas vezes
    // é erro de dinheiro. Nova tentativa só quando o usuário pede (docs/05).
    retry: false,
  },
} satisfies DefaultOptions;

export const queryClient = new QueryClient({
  defaultOptions: queryClientDefaultOptions,
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
