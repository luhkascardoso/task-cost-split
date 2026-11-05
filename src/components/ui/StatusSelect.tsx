import { Pressable, StyleSheet, View } from 'react-native';

import { shareStatusLabel, type ShareStatus } from '@/domain';
import { colors, radii, spacing } from '@/theme';
import { Text } from './Text';

/** Visual de cada segmento quando ativo. Novo status = nova entrada (o TS cobra). */
const palette: Record<ShareStatus, { bg: string; fg: 'success' | 'danger' }> = {
  pending: { bg: colors.dangerBg, fg: 'danger' },
  paid: { bg: colors.successBg, fg: 'success' },
};

/** Ordem de exibição dos segmentos = ordem de `shareStatusLabel` no domínio. */
const options = Object.keys(shareStatusLabel) as ShareStatus[];

/** Segmented control "Pendente | Pago" do detalhe da despesa (componente "Status Select" no Figma). */
export function StatusSelect({
  value,
  onChange,
  disabled,
  testID,
}: {
  value: ShareStatus;
  onChange: (value: ShareStatus) => void;
  disabled?: boolean;
  /** Prefixo do testID; segmentos viram `<testID>-pending` / `<testID>-paid`. */
  testID?: string;
}) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup" testID={testID}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => !active && onChange(option)}
            style={[styles.option, active && { backgroundColor: palette[option].bg }]}
            testID={testID ? `${testID}-${option}` : undefined}
          >
            <Text variant="textXs" tone={active ? palette[option].fg : 'secondary'}>
              {shareStatusLabel[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    gap: 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  option: { paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radii.sm },
});
