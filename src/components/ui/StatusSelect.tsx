import { Pressable, StyleSheet, View } from 'react-native';

import type { ShareStatus } from '@/domain';
import { colors, radii, spacing } from '@/theme';
import { Text } from './Text';

const options: { value: ShareStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
];

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
      {options.map((opt) => {
        const active = opt.value === value;
        const activeBg = opt.value === 'paid' ? colors.successBg : colors.dangerBg;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => !active && onChange(opt.value)}
            style={[styles.option, active && { backgroundColor: activeBg }]}
            testID={testID ? `${testID}-${opt.value}` : undefined}
          >
            <Text
              variant="textXs"
              tone={active ? (opt.value === 'paid' ? 'success' : 'danger') : 'secondary'}
            >
              {opt.label}
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
