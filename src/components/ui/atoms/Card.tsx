import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

export interface CardProps extends Omit<PressableProps, 'style'> {
  style?: ViewStyle;
}

/** Container com borda usado em todas as listas (atividades, despesas, participantes, resumo). */
export function Card({ onPress, style, children, ...rest }: CardProps) {
  if (!onPress) return <View style={[styles.card, style]}>{children as React.ReactNode}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }, style]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
});
