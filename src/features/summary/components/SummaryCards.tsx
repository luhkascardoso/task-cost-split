import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { formatBRL } from '@/domain';
import { colors, fonts, radii, sizes, spacing } from '@/theme';

/** Card grande do Resumo: ícone em caixa colorida + "R$ valor" + legenda. */
export function AmountCard({
  icon: Icon,
  tone,
  amount,
  caption,
}: {
  icon: LucideIcon;
  tone: 'success' | 'danger' | 'neutral';
  amount: number;
  caption: React.ReactNode;
}) {
  const box = {
    success: { bg: colors.successBg, fg: colors.success },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    neutral: { bg: colors.avatar, fg: colors.brandLight },
  }[tone];
  const [currency, value] = formatBRL(amount).split(' ');

  return (
    <Card style={styles.amountCard}>
      <View style={[styles.iconBox, { backgroundColor: box.bg }]}>
        <Icon size={sizes.iconSm} color={box.fg} />
      </View>
      <View>
        <Text style={styles.amount}>
          <Text variant="labelSm">{currency} </Text>
          {value}
        </Text>
        <Text variant="textSm" tone="secondary">
          {caption}
        </Text>
      </View>
    </Card>
  );
}

/** Card pequeno de contagem (Atividades / Despesas / Participantes). */
export function CountCard({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <Card style={styles.countCard}>
      <Icon size={sizes.iconSm} color={colors.brandLight} style={styles.countIcon} />
      <Text style={styles.amount}>{String(value).padStart(2, '0')}</Text>
      <Text variant="textXs" tone="secondary">
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  amountCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  amount: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, color: colors.textPrimary },
  countCard: { flex: 1, padding: spacing.sm, gap: spacing.xxs },
  countIcon: { position: 'absolute', top: 9, right: 9 },
});
