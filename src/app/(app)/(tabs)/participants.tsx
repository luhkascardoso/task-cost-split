import { Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Avatar, Card, EmptyState, Screen, TabHeader, Text } from '@/components/ui';
import { useParticipants } from '@/features/participants/api';
import { colors, spacing } from '@/theme';

/** Figma: Participantes / Vazio (5108:1339) e Lista (5108:1352). */
export default function ParticipantsScreen() {
  const { data, isLoading } = useParticipants();
  // Só aparece quem já está em alguma atividade; o próprio usuário não é listado.
  const participants = useMemo(
    () => (data ?? []).filter((p) => !p.isSelf && p.activitiesCount > 0),
    [data],
  );

  return (
    <Screen>
      <TabHeader title="Participantes" subtitle="Pessoas com quem você já dividiu tarefas" />
      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ flexGrow: 1, gap: spacing.xs }}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Avatar name={item.name} />
              <View>
                <Text variant="labelSm">{item.name}</Text>
                <Text variant="textXs" tone="muted">
                  Em {item.activitiesCount} {item.activitiesCount === 1 ? 'atividade' : 'atividades'}
                </Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState icon={Users} message="Você ainda não adicionou participantes em atividades" />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
});
