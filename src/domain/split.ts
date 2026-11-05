import type { Cents, ExpenseShare, ShareStatus } from './types';

/**
 * Divide um valor igualmente entre participantes, em centavos.
 * O resto da divisão é distribuído 1 centavo por vez aos primeiros participantes,
 * garantindo que a soma das cotas seja exatamente igual ao total.
 *
 *   splitEvenly(10000, ['a','b','c']) → a: 3334, b: 3333, c: 3333
 */
export function splitEvenly(total: Cents, participantIds: readonly string[]): Map<string, Cents> {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error('O total deve ser um inteiro não negativo em centavos');
  }
  const unique = [...new Set(participantIds)];
  if (unique.length === 0) {
    throw new Error('A despesa precisa de pelo menos um participante');
  }

  const base = Math.floor(total / unique.length);
  let remainder = total - base * unique.length;

  const result = new Map<string, Cents>();
  for (const id of unique) {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    result.set(id, base + extra);
  }
  return result;
}

/**
 * Monta as cotas de uma despesa a partir dos participantes selecionados.
 * Ao editar, preserva o status (pago/pendente) de quem já estava na despesa.
 */
export function buildShares(
  total: Cents,
  participantIds: readonly string[],
  previous: readonly ExpenseShare[] = [],
): ExpenseShare[] {
  const previousStatus = new Map<string, ShareStatus>(
    previous.map((s) => [s.participantId, s.status]),
  );
  return [...splitEvenly(total, participantIds)].map(([participantId, amount]) => ({
    participantId,
    amount,
    status: previousStatus.get(participantId) ?? 'pending',
  }));
}

/** Valor exibido como "R$ X / pessoa" no card da despesa (cota base, sem o centavo extra). */
export function perPersonAmount(total: Cents, participantsCount: number): Cents {
  if (participantsCount <= 0) return 0;
  return Math.floor(total / participantsCount);
}
