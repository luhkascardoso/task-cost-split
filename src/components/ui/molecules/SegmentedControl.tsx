import { createContext, use, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';
import { Text } from '../atoms/Text';

/**
 * Molécula COMPOUND (docs/12-atomic-design-e-compound.md): o pai guarda o estado
 * (valor, onChange, disabled, prefixo do testID) num Context e cada `Option` lê de lá.
 *
 *   <SegmentedControl value={status} onChange={setStatus} testID="share-status-1">
 *     <SegmentedControl.Option value="pending" tone="danger">Pendente</SegmentedControl.Option>
 *     <SegmentedControl.Option value="paid" tone="success">Pago</SegmentedControl.Option>
 *   </SegmentedControl>
 */

type Tone = 'neutral' | 'success' | 'danger';

/** Visual do segmento ativo. Novo tom = nova entrada (o TS cobra). */
const activePalette: Record<Tone, { bg: string; fg: 'primary' | 'success' | 'danger' }> = {
  neutral: { bg: colors.buttonSecondary, fg: 'primary' },
  success: { bg: colors.successBg, fg: 'success' },
  danger: { bg: colors.dangerBg, fg: 'danger' },
};

interface SegmentedControlState {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  testID?: string;
}

const SegmentedControlContext = createContext<SegmentedControlState | null>(null);

function useSegmentedControl() {
  const ctx = use(SegmentedControlContext);
  if (!ctx) throw new Error('<SegmentedControl.Option> precisa estar dentro de <SegmentedControl>.');
  return ctx;
}

function SegmentedControlRoot<T extends string>({
  value,
  onChange,
  disabled,
  testID,
  children,
}: {
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Prefixo do testID; cada opção vira `<testID>-<value>`. */
  testID?: string;
  children: React.ReactNode;
}) {
  const state = useMemo<SegmentedControlState>(
    () => ({ value, onChange: onChange as (value: string) => void, disabled, testID }),
    [value, onChange, disabled, testID],
  );
  return (
    <SegmentedControlContext value={state}>
      <View style={styles.container} accessibilityRole="radiogroup" testID={testID}>
        {children}
      </View>
    </SegmentedControlContext>
  );
}

function Option({ value, tone = 'neutral', children }: { value: string; tone?: Tone; children: string }) {
  const ctx = useSegmentedControl();
  const active = ctx.value === value;
  const palette = activePalette[tone];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled: ctx.disabled }}
      disabled={ctx.disabled}
      onPress={() => !active && ctx.onChange(value)}
      style={[styles.option, active && { backgroundColor: palette.bg }]}
      testID={ctx.testID ? `${ctx.testID}-${value}` : undefined}
    >
      <Text variant="textXs" tone={active ? palette.fg : 'secondary'}>
        {children}
      </Text>
    </Pressable>
  );
}

export const SegmentedControl = Object.assign(SegmentedControlRoot, { Option });

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
