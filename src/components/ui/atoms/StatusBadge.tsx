import { StyleSheet, View } from 'react-native';

import { expenseStatusLabel, type ExpenseStatus } from '@/domain';
import { colors, radii, spacing } from '@/theme';
import { Text } from './Text';

const palette: Record<ExpenseStatus, { bg: string; fg: 'success' | 'danger' | 'alert' }> = {
  paid: { bg: colors.successBg, fg: 'success' },
  pending: { bg: colors.dangerBg, fg: 'danger' },
  partial: { bg: colors.alertBg, fg: 'alert' },
};

/** Badge de status da despesa: Pago / Pendente / Parcial. */
export function StatusBadge({ status }: { status: ExpenseStatus }) {
  const p = palette[status];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }]}>
      <Text variant="textXs" tone={p.fg}>
        {expenseStatusLabel[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
});
