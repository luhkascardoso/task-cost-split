import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Pencil, Plus } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AvatarGroup, Button, EmptyState, Fab, Screen, Text } from '@/components/ui';
import { formatBRL, getActivityTotals } from '@/domain';
import { useActivity } from '@/features/activities/api';
import { useExpenses } from '@/features/expenses/api';
import { ExpenseCard } from '@/features/expenses/components/ExpenseCard';
import { useParticipantNames } from '@/features/participants/hooks';
import { formatShortDate } from '@/lib/date';
import { colors, sizes, spacing } from '@/theme';

/** Figma: Detalhes da atividade — Lista vazia (5109:1808) e Lista de despesas (5109:842). */
export default function ActivityDetailScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const activity = useActivity(activityId);
  const expenses = useExpenses(activityId);
  const names = useParticipantNames();

  const totals = useMemo(() => getActivityTotals(expenses.data ?? []), [expenses.data]);
  const openExpense = useCallback(
    (expenseId: string) =>
      router.push({
        pathname: '/activity/[activityId]/expense/[expenseId]',
        params: { activityId, expenseId },
      }),
    [activityId],
  );
  const newExpense = () =>
    router.push({ pathname: '/activity/[activityId]/expense/new', params: { activityId } });

  if (!activity.data) return <Screen><ActivityIndicator color={colors.brand} style={{ flex: 1 }} /></Screen>;

  const hasExpenses = (expenses.data?.length ?? 0) > 0;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <ArrowLeft size={sizes.iconSm} color={colors.brandLight} />
            <Text variant="textSm" tone="brand">Voltar</Text>
          </Pressable>
          <Text variant="labelLg">{activity.data.title}</Text>
          <View style={styles.back}>
            <Calendar size={sizes.iconSm} color={colors.textSecondary} />
            <Text variant="textSm" tone="secondary">{formatShortDate(activity.data.date)}</Text>
          </View>
        </View>
        <Button
          icon={Pencil}
          variant="secondary"
          accessibilityLabel="Editar atividade"
          onPress={() => router.push({ pathname: '/activity/[activityId]/edit', params: { activityId } })}
        />
      </View>

      {hasExpenses && (
        <View style={styles.totals}>
          <View style={{ gap: 2 }}>
            <AvatarGroup names={totals.participantIds.map((id) => names.get(id) ?? '?')} />
            <Text variant="textSm" tone="secondary">{totals.participantIds.length} participantes</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="labelMd" tone="brand">{formatBRL(totals.total)}</Text>
            <Text variant="textSm" tone="secondary">Gastos totais</Text>
          </View>
        </View>
      )}

      <FlatList
        data={expenses.data}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ flexGrow: 1, gap: spacing.xs, paddingBottom: 96 }}
        ListHeaderComponent={
          hasExpenses ? (
            <View style={styles.listHeader}>
              <Text variant="labelMd">Despesas</Text>
              <Text variant="textSm" tone="secondary">{expenses.data?.length}</Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <ExpenseCard expense={item} participantNames={names} onPress={openExpense} />
        )}
        ListEmptyComponent={
          expenses.isLoading ? undefined : (
            <EmptyState
              icon={Clock}
              message="Para começar a dividir, registre uma despesa"
              action={<Button label="Nova despesa" icon={Plus} onPress={newExpense} />}
            />
          )
        }
      />
      {hasExpenses && <Fab label="Nova" onPress={newExpense} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  totals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.lg },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xxs },
});
