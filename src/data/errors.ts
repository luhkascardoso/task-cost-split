import { DataError, type DataErrorCode } from './types';

/**
 * Falhas transitórias: as únicas que podem ser repetidas automaticamente, e só em leituras.
 * Escritas nunca são repetidas sem o usuário pedir (docs/05-regras-de-negocio.md).
 */
const RECOVERABLE_CODES: ReadonlySet<DataErrorCode> = new Set(['network', 'timeout', 'server']);

export function isRecoverableError(error: unknown): boolean {
  return error instanceof DataError && RECOVERABLE_CODES.has(error.code);
}

/** Mensagens padrão dos códigos que o app não gera com texto próprio. */
export const DEFAULT_ERROR_MESSAGES = {
  network: 'Sem conexão. Verifique sua internet e tente de novo.',
  timeout: 'O serviço demorou para responder. Tente de novo.',
  server: 'O serviço está indisponível no momento. Tente de novo em instantes.',
  unknown: 'Algo deu errado. Tente de novo.',
} as const satisfies Partial<Record<DataErrorCode, string>>;

/**
 * Ponto único de normalização: qualquer erro vira `DataError`.
 * Implementações de `DataSource` (ex.: o futuro adaptador HTTP) devem passar seus erros por aqui
 * em vez de lançar `Error` genérico, que apaga o contexto.
 */
export function toDataError(error: unknown): DataError {
  if (error instanceof DataError) return error;
  return new DataError(DEFAULT_ERROR_MESSAGES.unknown, 'unknown', { original: error });
}
