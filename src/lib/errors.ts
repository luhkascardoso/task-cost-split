/**
 * Erros do app: tipo único, classificação e normalização.
 * Fica em `lib` (base das camadas): `data` lança, `lib/query-client` decide o retry e
 * `lib/error-message` escolhe o texto da tela, sem `lib` depender de `data`.
 */

/**
 * Códigos de `DataError`.
 * - `unauthorized`, `not_found`, `conflict`, `invalid`: erros de negócio/entrada. Repetir não muda o resultado.
 * - `network`, `timeout`, `server`: falhas transitórias de infraestrutura (o adaptador HTTP as lança).
 *   São as únicas que justificam nova tentativa automática, e só em leituras (docs/05).
 * - `unknown`: qualquer erro não mapeado, normalizado por `toDataError`.
 */
export type DataErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown';

/**
 * Único tipo de erro que sai da camada de dados. A mensagem já vem pronta para a UI.
 * `status` (HTTP) e `original` (erro de origem) ajudam no diagnóstico e nunca vão para a tela.
 */
export class DataError extends Error {
  readonly status?: number;
  readonly original?: unknown;

  constructor(
    message: string,
    readonly code: DataErrorCode = 'invalid',
    options: { status?: number; original?: unknown } = {},
  ) {
    super(message);
    this.name = 'DataError';
    this.status = options.status;
    this.original = options.original;
  }
}

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
