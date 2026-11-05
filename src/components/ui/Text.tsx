import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

type Tone = 'primary' | 'secondary' | 'muted' | 'brand' | 'success' | 'danger' | 'alert' | 'onBrand';

const toneColor: Record<Tone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  brand: colors.brandLight,
  success: colors.success,
  danger: colors.danger,
  alert: colors.alert,
  onBrand: colors.textOnBrand,
};

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
}

/** Único componente de texto do app — garante que só estilos do Figma sejam usados. */
export function Text({ variant = 'textMd', tone = 'primary', align, style, ...rest }: TextProps) {
  return (
    <RNText
      style={[typography[variant], { color: toneColor[tone], textAlign: align }, style]}
      {...rest}
    />
  );
}
