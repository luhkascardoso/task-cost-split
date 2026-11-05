import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { useExpense } from '@/features/expenses/api';
import { ExpenseFormSheet } from '@/features/expenses/components/ExpenseFormSheet';
import { colors } from '@/theme';

/** Sheet: Editar despesa. Mantém o status (pago/pendente) de quem continua na despesa. */
export default function EditExpenseSheet() {
  const { activityId, expenseId } = useLocalSearchParams<{ activityId: string; expenseId: string }>();
  const { data } = useExpense(expenseId);
  if (!data) return <ActivityIndicator color={colors.brand} style={{ padding: 48 }} />;
  return <ExpenseFormSheet activityId={activityId} expense={data} />;
}
