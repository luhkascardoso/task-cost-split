import { router } from 'expo-router';
import { Check, CircleAlert, CircleDollarSign, Clock, List, Plus, Users } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button, EmptyState, Screen, TabHeader, Text } from '@/components/ui';
import { useSummary } from '@/features/summary/api';
import { AmountCard, CountCard } from '@/features/summary/components/SummaryCards';
import { colors, spacing } from '@/theme';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Figma: Resumo / Vazio (5108:1165) e Lista (5108:1239). */
export default function SummaryScreen() {
  const { data, isLoading } = useSummary();

  return (
    <Screen>
      <TabHeader title="Resumo" subtitle="Acompanhe as informações principais sobre suas atividades" />
      {isLoading || !data ? (
        <ActivityIndicator color={colors.brand} style={{ flex: 1 }} />
      ) : data.general.activitiesCount === 0 ? (
        <EmptyState
          icon={Clock}
          message="Para começar a acompanhar, crie uma atividade"
          action={<Button label="Criar atividade" icon={Plus} onPress={() => router.push('/activity/new')} />}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Section title="Minhas contas">
            <AmountCard
              icon={Check}
              tone="success"
              amount={data.mine.paid.amount}
              caption={<>Pago em <Text variant="labelSm" tone="secondary">{plural(data.mine.paid.expensesCount, 'despesa')}</Text></>}
            />
            <AmountCard
              icon={CircleAlert}
              tone="danger"
              amount={data.mine.pending.amount}
              caption={<>Pendente em <Text variant="labelSm" tone="secondary">{plural(data.mine.pending.expensesCount, 'despesa')}</Text></>}
            />
          </Section>
          <Section title="Informações gerais">
            <AmountCard icon={Clock} tone="neutral" amount={data.general.total} caption="Total de despesas" />
            <View style={styles.row}>
              <CountCard icon={List} value={data.general.activitiesCount} label="Atividades" />
              <CountCard icon={CircleDollarSign} value={data.general.expensesCount} label="Despesas" />
              <CountCard icon={Users} value={data.general.participantsCount} label="Participantes" />
            </View>
          </Section>
        </ScrollView>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="labelSm">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.lg },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.xs },
});
