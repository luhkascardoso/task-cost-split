import { Calendar, Receipt, Users } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { formatBRL } from '@/domain';
import { formatShortDate } from '@/lib/date';
import { colors, sizes, spacing } from '@/theme';
import type { ActivityListItem } from '../api';

/** Card da lista de atividades (componente "Card" 342x108 no Figma). */
export const ActivityCard = memo(function ActivityCard({
  activity,
  onPress,
}: {
  activity: ActivityListItem;
  onPress: (id: string) => void;
}) {
  return (
    <Card
      onPress={() => onPress(activity.id)}
      style={styles.card}
      testID={`activity-card-${activity.id}`}
      accessibilityRole="button"
      accessibilityLabel={activity.title}
    >
      <View style={styles.row}>
        <Text variant="labelSm" numberOfLines={1} style={{ flex: 1 }}>
          {activity.title}
        </Text>
        <Text variant="labelSm">{formatBRL(activity.total)}</Text>
      </View>
      <View style={styles.meta}>
        <Meta icon={Calendar} label={formatShortDate(activity.date)} />
        <Meta icon={Users} label={`${activity.participantIds.length} pessoas`} />
        <Meta icon={Receipt} label={`${activity.expensesCount} despesas`} />
      </View>
    </Card>
  );
});

function Meta({ icon: Icon, label }: { icon: typeof Calendar; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon size={sizes.iconSm} color={colors.textMuted} />
      <Text variant="textXs" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.xs },
  meta: { flexDirection: 'row', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
