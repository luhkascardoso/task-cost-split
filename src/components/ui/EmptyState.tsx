import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, sizes, spacing } from '@/theme';
import { Text } from './Text';

/** Estado vazio centralizado (ícone + texto + ação opcional), presente em todas as listas do Figma. */
export function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: LucideIcon;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      <Icon size={sizes.iconMd} color={colors.textSecondary} />
      <Text variant="textSm" tone="muted" align="center" style={styles.message}>
        {message}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  message: { maxWidth: 200 },
});
