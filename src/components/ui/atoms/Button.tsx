import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'danger';

/** Nova variante = nova entrada aqui. O TypeScript aponta se faltar alguma. */
const variants: Record<Variant, { container: 'primary' | 'secondary'; fg: string }> = {
  primary: { container: 'primary', fg: colors.textOnBrand },
  secondary: { container: 'secondary', fg: colors.textPrimary },
  danger: { container: 'secondary', fg: colors.danger },
};

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label?: string;
  icon?: LucideIcon;
  variant?: Variant;
  loading?: boolean;
  /** Ocupa toda a largura (formulários). */
  block?: boolean;
}

/**
 * Variantes do Figma:
 *  - primary: verde, pílula ("Entrar", "Salvar", "+ Criar")
 *  - secondary: cinza ("Criar conta", "Editar", botão-ícone de lápis)
 *  - danger: cinza com ícone vermelho (lixeira)
 * Só ícone (sem label) → botão circular 48x48.
 */
export function Button({
  label,
  icon: Icon,
  variant = 'primary',
  loading,
  block,
  disabled,
  ...rest
}: ButtonProps) {
  const iconOnly = !label;
  const { container, fg } = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[container],
        iconOnly && styles.iconOnly,
        block && styles.block,
        (pressed || disabled) && { opacity: 0.7 },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {Icon && <Icon size={sizes.iconMd} color={fg} />}
          {label && (
            <Text variant="labelMd" style={{ color: fg }}>
              {label}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: sizes.controlHeight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  primary: { backgroundColor: colors.brand, borderWidth: 1, borderColor: colors.brandLight },
  secondary: { backgroundColor: colors.buttonSecondary },
  iconOnly: { width: sizes.controlHeight, paddingHorizontal: 0 },
  block: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
