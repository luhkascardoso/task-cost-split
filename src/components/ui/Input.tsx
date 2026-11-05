import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radii, sizes, spacing, typography } from '@/theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  icon?: LucideIcon;
  /** Texto fixo à esquerda, ex.: "R$". */
  prefix?: string;
  error?: string;
  ref?: React.Ref<React.ComponentRef<typeof TextInput>>;
}

export function Input({ icon: Icon, prefix, error, style, ref, ...rest }: InputProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {Icon && <Icon size={sizes.iconSm} color={colors.textSecondary} />}
        {prefix && <Text variant="textMd">{prefix}</Text>}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brand}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
      {error && (
        <Text variant="textXs" tone="danger">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xxs },
  field: {
    height: sizes.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.input,
  },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.textPrimary, ...typography.textMd },
});
