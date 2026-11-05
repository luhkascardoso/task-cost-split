import { router } from 'expo-router';
import { List } from 'lucide-react-native';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { EmptyState, Fab, Screen, TabHeader } from '@/components/ui';
import { useActivities } from '@/features/activities/api';
import { ActivityCard } from '@/features/activities/components/ActivityCard';
import { colors, spacing } from '@/theme';

/**
 * Figma: Atividades / Vazio (3102:649) e Lista (5108:890).
 * TELA DE REFERÊNCIA — use como padrão para as demais: query hook + estados loading/vazio/lista.
 */
export default function ActivitiesScreen() {
  const { data, isLoading, refetch, isRefetching } = useActivities();
  const openActivity = useCallback(
    (id: string) => router.push({ pathname: '/activity/[activityId]', params: { activityId: id } }),
    [],
  );

  return (
    <Screen>
      <TabHeader title="Atividades" subtitle="Organize suas despesas divididas" />
      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <ActivityCard activity={item} onPress={openActivity} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
          ListEmptyComponent={
            <EmptyState icon={List} message="Você ainda não tem atividades criadas" />
          }
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
      <Fab label="Criar" onPress={() => router.push('/activity/new')} />
    </Screen>
  );
}
