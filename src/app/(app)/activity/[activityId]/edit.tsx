import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { useActivity } from '@/features/activities/api';
import { ActivityFormSheet } from '@/features/activities/components/ActivityFormSheet';
import { colors } from '@/theme';

/** Sheet: Editar atividade. */
export default function EditActivitySheet() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const { data } = useActivity(activityId);
  if (!data) return <ActivityIndicator color={colors.brand} style={{ padding: 48 }} />;
  return <ActivityFormSheet activity={data} />;
}
