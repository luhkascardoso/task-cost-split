import { DataError } from '@/data/types';

import { DEFAULT_ERROR_MESSAGES } from '@/data/errors';

/**
 * Mensagem de erro para a UI. `DataError` já traz texto pronto; qualquer outro erro
 * (bug, exceção inesperada) mostra um texto genérico, nunca a mensagem técnica.
 */
export function errorMessage(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGES.unknown): string {
  return error instanceof DataError ? error.message : fallback;
}
