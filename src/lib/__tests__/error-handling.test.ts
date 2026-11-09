import { DataError } from '@/data/types';
import { DEFAULT_ERROR_MESSAGES } from '@/data/errors';

import { errorMessage } from '../error-message';
import { MAX_QUERY_RETRIES, queryClient, shouldRetryQuery } from '../query-client';

describe('errorMessage', () => {
  it('usa a mensagem do DataError, já pronta para a UI', () => {
    expect(errorMessage(new DataError('E-mail ou senha inválidos', 'unauthorized'))).toBe('E-mail ou senha inválidos');
  });

  it('nunca mostra a mensagem técnica de um erro inesperado', () => {
    expect(errorMessage(new TypeError('Cannot read properties of undefined'))).toBe(DEFAULT_ERROR_MESSAGES.unknown);
  });

  it('aceita um texto de fallback específico da tela', () => {
    expect(errorMessage(new Error('x'), 'Não foi possível atualizar o status.')).toBe('Não foi possível atualizar o status.');
  });
});

describe('política de retry do QueryClient', () => {
  it('leitura repete falha transitória até o limite', () => {
    const offline = new DataError('Sem conexão', 'network');
    expect(shouldRetryQuery(0, offline)).toBe(true);
    expect(shouldRetryQuery(MAX_QUERY_RETRIES - 1, offline)).toBe(true);
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, offline)).toBe(false);
  });

  it('leitura não repete erro de negócio nem erro inesperado', () => {
    expect(shouldRetryQuery(0, new DataError('Sessão expirada', 'unauthorized'))).toBe(false);
    expect(shouldRetryQuery(0, new DataError('Despesa não encontrada', 'not_found'))).toBe(false);
    expect(shouldRetryQuery(0, new Error('bug'))).toBe(false);
  });

  it('o QueryClient usa essa política nas queries', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(shouldRetryQuery);
  });

  it('mutations nunca são repetidas automaticamente (escrita de dinheiro)', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
