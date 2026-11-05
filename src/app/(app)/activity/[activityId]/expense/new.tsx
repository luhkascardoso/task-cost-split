import { useLocalSearchParams } from 'expo-router';

import { ExpenseFormSheet } from '@/features/expenses/components/ExpenseFormSheet';

/** Sheet: Nova despesa. */
export default function NewExpenseSheet() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  return <ExpenseFormSheet activityId={activityId} />;
}
