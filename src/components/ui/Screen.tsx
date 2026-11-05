import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, sizes, spacing } from '@/theme';
import { Logo } from './Logo';
import { Text } from './Text';

/** Container padrão de tela: fundo, safe area e gutter de 24px. */
export function Screen({
  children,
  edges = ['top'],
}: {
  children: React.ReactNode;
  edges?: Edge[];
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

/** Cabeçalho das abas: logo + título + subtítulo (Atividades, Resumo, Participantes). */
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

/** Container de conteúdo dos form sheets (Nova atividade, Nova despesa, detalhe da despesa). */
export function Sheet({ children }: { children: React.ReactNode }) {
  return <View style={styles.sheet}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: sizes.screenGutter, paddingTop: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.md },
  sheet: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.surface },
});
