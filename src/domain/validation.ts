import type { Cents } from './types';

/**
 * Regras de validação de entrada que valem para QUALQUER fonte de dados
 * (mock hoje, backend depois). Devolvem a mensagem de erro pronta para a UI,
 * ou null se a entrada for válida. Quem chama decide como sinalizar o erro.
 */

export interface ExpenseDraft {
  title: string;
  amount: Cents;
  participantIds: readonly string[];
}

export function getExpenseInputError(input: ExpenseDraft): string | null {
  if (!input.title.trim()) return 'Informe um título';
  if (!Number.isInteger(input.amount) || input.amount <= 0) return 'Informe um valor';
  if (input.participantIds.length === 0) return 'Adicione pelo menos um participante';
  return null;
}

export function getParticipantNameError(name: string): string | null {
  return name.trim() ? null : 'Informe o nome do participante';
}
