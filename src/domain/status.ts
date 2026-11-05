import type { ExpenseShare, ExpenseStatus, ShareStatus } from './types';

/**
 * Status agregado da despesa (badge do card):
 *  - todas as cotas pagas  → 'paid'    ("Pago")
 *  - nenhuma cota paga     → 'pending' ("Pendente")
 *  - parte paga            → 'partial' ("Parcial")
 */
export function getExpenseStatus(shares: readonly Pick<ExpenseShare, 'status'>[]): ExpenseStatus {
  if (shares.length === 0) return 'pending';
  const paid = shares.filter((s) => s.status === 'paid').length;
  if (paid === 0) return 'pending';
  if (paid === shares.length) return 'paid';
  return 'partial';
}

export const expenseStatusLabel: Record<ExpenseStatus, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
};

/** Status de cada cota (segmented control "Pendente | Pago"). Ordem = ordem de exibição. */
export const shareStatusLabel: Record<ShareStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
};
