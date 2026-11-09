import { router } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar, Button, Sheet, StatusBadge, StatusSelect, Text } from '@/components/ui';
import { formatBRL, getExpenseStatus, type Expense } from '@/domain';
import { useParticipantNames } from '@/features/participants/hooks';
import { errorMessage } from '@/lib/error-message';
import { colors, spacing } from '@/theme';
import { useDeleteExpense, useSetShareStatus } from '../api';

/** Sheet: Detalhe da despesa (Figma 5109:1683): marcar cada cota como Pendente/Pago. */
export function ExpenseDetailSheet({ expense }: { expense: Expense }) {
  const names = useParticipantNames();
  const setStatus = useSetShareStatus(expense);
  const confirmDelete = useConfirmDeleteExpense(expense);

  return (
    <Sheet onClose={() => router.back()}>
      <Sheet.Header align="start">
        <View>
          <Text variant="labelLg">{expense.title}</Text>
          <Text variant="labelMd" tone="brand">{formatBRL(expense.amount)}</Text>
        </View>
        <Sheet.Close />
      </Sheet.Header>

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
        {setStatus.isError && (
          <Text variant="textXs" tone="danger" accessibilityLiveRegion="polite">
            {errorMessage(setStatus.error, 'Não foi possível atualizar o status. Tente de novo.')}
          </Text>
        )}
      </View>

      <Sheet.Footer>
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
      </Sheet.Footer>
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
          try {
            await remove.mutateAsync(expense.id);
          } catch (error) {
            Alert.alert('Não foi possível excluir', errorMessage(error));
            return;
          }
          router.back();
        },
      },
    ]);
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.cardBorder },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
