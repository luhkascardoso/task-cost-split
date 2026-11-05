import { useMutation, useQuery } from '@tanstack/react-query';

import { data } from '@/data';
import type { Expense, ShareStatus } from '@/domain';
import { queryClient, queryKeys } from '@/lib/query-client';
import type { ExpenseFormInput } from './schemas';

export function useExpenses(activityId: string) {
  return useQuery({
    queryKey: queryKeys.expenses.byActivity(activityId),
    queryFn: () => data.expenses.listByActivity(activityId),
  });
}

export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: queryKeys.expenses.detail(expenseId),
    queryFn: () => data.expenses.get(expenseId),
  });
}

/**
 * Cria/edita despesa. O app envia só os participantIds — a divisão das cotas
 * é responsabilidade da fonte de dados (ver contrato em src/data/types.ts).
 */
export function useSaveExpense(activityId: string, existing?: Expense) {
  return useMutation({
    mutationFn: (input: ExpenseFormInput) =>
      existing ? data.expenses.update(existing.id, input) : data.expenses.create(activityId, input),
    onSuccess: () => invalidateExpenses(activityId),
  });
}

/** Segmented control "Pendente | Pago" no detalhe da despesa. Atualização otimista. */
export function useSetShareStatus(expense: Pick<Expense, 'id' | 'activityId'>) {
  const key = queryKeys.expenses.detail(expense.id);
  return useMutation({
    mutationFn: ({ participantId, status }: { participantId: string; status: ShareStatus }) =>
      data.expenses.setShareStatus(expense.id, participantId, status),
    onMutate: async ({ participantId, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Expense>(key);
      if (previous) {
        queryClient.setQueryData<Expense>(key, {
          ...previous,
          shares: previous.shares.map((s) => (s.participantId === participantId ? { ...s, status } : s)),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => invalidateExpenses(expense.activityId),
  });
}

export function useDeleteExpense(activityId: string) {
  return useMutation({
    mutationFn: (expenseId: string) => data.expenses.remove(expenseId),
    onSuccess: () => invalidateExpenses(activityId),
  });
}

function invalidateExpenses(activityId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byActivity(activityId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.activities.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.summary }),
    queryClient.invalidateQueries({ queryKey: queryKeys.participants.all }),
  ]);
}
