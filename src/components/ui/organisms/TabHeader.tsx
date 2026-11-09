import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { Logo } from '../atoms/Logo';
import { Text } from '../atoms/Text';

/** Organismo: cabeçalho das abas, com logo + título + subtítulo (Atividades, Resumo, Participantes). */
export function TabHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Logo />
      <View style={{ gap: spacing.xxs }}>
        <Text variant="labelLg">{title}</Text>
        <Text variant="textMd" tone="secondary">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginBottom: spacing.md },
});
