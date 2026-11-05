import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Logo, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

/** Layout compartilhado de Login/Cadastro: logo grande no topo + painel inferior arredondado. */
export function AuthLayout({
  title,
  children,
  footerText,
  footerAction,
  onFooterPress,
}: {
  title: string;
  children: React.ReactNode;
  footerText: string;
  footerAction: string;
  onFooterPress: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Logo size="lg" />
          </View>
          <View style={styles.panel}>
            <Text variant="labelLg" align="center">
              {title}
            </Text>
            {children}
            <View style={styles.footer}>
              <Text variant="textSm" tone="secondary" align="center">
                {footerText}
              </Text>
              <Button
                label={footerAction}
                variant="secondary"
                block
                onPress={onFooterPress}
                testID="auth-footer-action"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  footer: { gap: spacing.md, marginTop: spacing.md },
});
