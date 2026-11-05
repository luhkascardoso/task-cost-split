import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarGroup, Card, StatusBadge, Text } from '@/components/ui';
import {
  expenseStatusLabel,
  formatBRL,
  getExpenseStatus,
  perPersonAmount,
  type Expense,
} from '@/domain';
import { spacing } from '@/theme';

/** Card de despesa no detalhe da atividade (componente "Card" 342x126). */
export const ExpenseCard = memo(function ExpenseCard({
  expense,
  participantNames,
  onPress,
}: {
  expense: Expense;
  /** nome por participantId */
  participantNames: Map<string, string>;
  onPress: (id: string) => void;
}) {
  const names = expense.shares.map((s) => participantNames.get(s.participantId) ?? '?');
  const status = getExpenseStatus(expense.shares);
  return (
    <Card
      onPress={() => onPress(expense.id)}
      style={styles.card}
      testID={`expense-card-${expense.id}`}
      accessibilityRole="button"
      // Label curto e estável p/ VoiceOver + Maestro (Pressable no iOS agrega os filhos).
      accessibilityLabel={`${expense.title}, ${expenseStatusLabel[status]}`}
      accessibilityHint={formatBRL(expense.amount)}
    >
      <View style={styles.row}>
        <Text variant="labelSm" numberOfLines={1} style={{ flex: 1 }}>
          {expense.title}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="labelSm">{formatBRL(expense.amount)}</Text>
          <Text variant="textXs" tone="secondary">
            {formatBRL(perPersonAmount(expense.amount, expense.shares.length))} / pessoa
          </Text>
        </View>
      </View>
      <View style={[styles.row, { alignItems: 'center' }]}>
        <AvatarGroup names={names} />
        <StatusBadge status={status} />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
});
