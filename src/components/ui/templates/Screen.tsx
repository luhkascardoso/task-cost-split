import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, sizes, spacing } from '@/theme';

/** Template: container padrão de tela cheia (fundo, safe area e gutter de 24px). */
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: sizes.screenGutter, paddingTop: spacing.md },
});
