import type { Activity, Cents, Expense, Participant } from './types';

export interface ActivityTotals {
  total: Cents;
  expensesCount: number;
  participantIds: string[];
}

/** Totais exibidos no card da atividade e no cabeçalho do detalhe. */
export function getActivityTotals(expenses: readonly Expense[]): ActivityTotals {
  const participantIds = new Set<string>();
  let total = 0;
  for (const expense of expenses) {
    total += expense.amount;
    for (const share of expense.shares) participantIds.add(share.participantId);
  }
  return { total, expensesCount: expenses.length, participantIds: [...participantIds] };
}

export interface Summary {
  /** "Minhas contas" — cotas do participante isSelf. */
  mine: {
    paid: { amount: Cents; expensesCount: number };
    pending: { amount: Cents; expensesCount: number };
  };
  /** "Informações gerais". */
  general: {
    total: Cents;
    activitiesCount: number;
    expensesCount: number;
    participantsCount: number;
  };
}

/** Calcula a tela Resumo a partir dos dados brutos do usuário. */
export function getSummary(input: {
  activities: readonly Activity[];
  expenses: readonly Expense[];
  participants: readonly Participant[];
}): Summary {
  const self = input.participants.find((p) => p.isSelf);
  const summary: Summary = {
    mine: {
      paid: { amount: 0, expensesCount: 0 },
      pending: { amount: 0, expensesCount: 0 },
    },
    general: {
      total: 0,
      activitiesCount: input.activities.length,
      expensesCount: input.expenses.length,
      // O próprio usuário não conta como "participante" na UI.
      participantsCount: input.participants.filter((p) => !p.isSelf).length,
    },
  };

  for (const expense of input.expenses) {
    summary.general.total += expense.amount;
    if (!self) continue;
    const myShare = expense.shares.find((s) => s.participantId === self.id);
    if (!myShare) continue;
    const bucket = summary.mine[myShare.status === 'paid' ? 'paid' : 'pending'];
    bucket.amount += myShare.amount;
    bucket.expensesCount += 1;
  }

  return summary;
}
