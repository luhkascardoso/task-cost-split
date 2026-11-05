import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { useExpense } from '@/features/expenses/api';
import { ExpenseDetailSheet } from '@/features/expenses/components/ExpenseDetailSheet';
import { colors } from '@/theme';

/** Sheet: Detalhe da despesa (Figma 5109:1683). */
export default function ExpenseDetailRoute() {
  const { expenseId } = useLocalSearchParams<{ activityId: string; expenseId: string }>();
  const { data: expense } = useExpense(expenseId);
  if (!expense) return <ActivityIndicator color={colors.brand} style={{ padding: 48 }} />;
  return <ExpenseDetailSheet expense={expense} />;
}
