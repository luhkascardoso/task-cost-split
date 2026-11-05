import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query-client';

/** Métricas fixas: sem isso o SafeAreaProvider não renderiza os filhos no Jest. */
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Todos os providers que o app monta no root layout (exceto navegação). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: AppProviders });
}

export function renderHookWithProviders<T>(hook: () => T) {
  return renderHook(hook, { wrapper: AppProviders });
}
