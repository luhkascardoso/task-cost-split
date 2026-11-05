import { Stack } from 'expo-router';

import { colors, radii } from '@/theme';

/**
 * Stack autenticado. Os formulários e o detalhe da despesa são rotas `formSheet`
 * (sheets nativos) — assim cada sheet é deep-linkável e não há estado global de modal.
 * Limitação: dentro de formSheet não há header nativo, então título/fechar ficam no conteúdo.
 */
const sheet = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: radii.sheet,
  contentStyle: { backgroundColor: colors.surface },
} as const;

/** Deep link direto para uma atividade/sheet ainda tem as abas por baixo (botão voltar funciona). */
export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="activity/[activityId]/index" />

      <Stack.Screen name="activity/new" options={sheet} />
      <Stack.Screen name="activity/[activityId]/edit" options={sheet} />
      <Stack.Screen name="activity/[activityId]/expense/new" options={sheet} />
      <Stack.Screen name="activity/[activityId]/expense/[expenseId]/index" options={sheet} />
      <Stack.Screen name="activity/[activityId]/expense/[expenseId]/edit" options={sheet} />
    </Stack>
  );
}
