import { router } from 'expo-router';
import { Pencil, Trash2, X } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Sheet, StatusBadge, StatusSelect, Text } from '@/components/ui';
import { formatBRL, getExpenseStatus, type Expense } from '@/domain';
import { useParticipantNames } from '@/features/participants/hooks';
import { colors, sizes, spacing } from '@/theme';
import { useDeleteExpense, useSetShareStatus } from '../api';

/** Sheet: Detalhe da despesa (Figma 5109:1683): marcar cada cota como Pendente/Pago. */
export function ExpenseDetailSheet({ expense }: { expense: Expense }) {
  const names = useParticipantNames();
  const setStatus = useSetShareStatus(expense);
  const confirmDelete = useConfirmDeleteExpense(expense);

  return (
    <Sheet>
      <View style={styles.header}>
        <View>
          <Text variant="labelLg">{expense.title}</Text>
          <Text variant="labelMd" tone="brand">{formatBRL(expense.amount)}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Fechar">
          <X size={sizes.iconSm} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.list}>
        <View style={styles.row}>
          <Text variant="textSm" tone="secondary">{expense.shares.length} participantes</Text>
          <StatusBadge status={getExpenseStatus(expense.shares)} />
        </View>
        {expense.shares.map((share) => {
          const name = names.get(share.participantId) ?? '?';
          return (
            <View key={share.participantId} style={styles.person}>
              <Avatar name={name} size="lg" />
              <View style={{ flex: 1 }}>
                <Text variant="labelMd">{name}</Text>
                <Text variant="textSm" tone="secondary">{formatBRL(share.amount)}</Text>
              </View>
              <StatusSelect
                value={share.status}
                onChange={(status) => setStatus.mutate({ participantId: share.participantId, status })}
                testID={`share-status-${share.participantId}`}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.row}>
        <Button icon={Trash2} variant="danger" accessibilityLabel="Excluir despesa" onPress={confirmDelete} />
        <Button
          label="Editar"
          icon={Pencil}
          variant="secondary"
          onPress={() =>
            router.replace({
              pathname: '/activity/[activityId]/expense/[expenseId]/edit',
              params: { activityId: expense.activityId, expenseId: expense.id },
            })
          }
        />
      </View>
    </Sheet>
  );
}

/** Pede confirmação, exclui e fecha o sheet. */
function useConfirmDeleteExpense(expense: Pick<Expense, 'id' | 'activityId' | 'title'>) {
  const remove = useDeleteExpense(expense.activityId);
  return () =>
    Alert.alert('Excluir despesa', `Excluir "${expense.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync(expense.id);
          router.back();
        },
      },
    ]);
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  list: { gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.cardBorder },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
