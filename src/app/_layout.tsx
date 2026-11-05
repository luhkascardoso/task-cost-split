import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Sora_400Regular, Sora_700Bold } from '@expo-google-fonts/sora';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { restoreSession, useSessionStore } from '@/features/auth/session-store';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/theme';

// Banner do LogBox cobre a tab bar e quebra taps do Maestro no iOS.
LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();
restoreSession();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Sora_400Regular,
    Sora_700Bold,
  });
  const initialized = useSessionStore((s) => s.initialized);
  const isLoggedIn = useSessionStore((s) => !!s.session);
  const ready = fontsLoaded && initialized;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {/* "/" sempre disponível: redireciona para (auth) ou (app). Ver src/app/index.tsx */}
          <Stack.Screen name="index" />
          {/* Fora dos guards: Maestro chama taskcostsplit://e2e-sign-out entre flows */}
          <Stack.Screen name="e2e-sign-out" />
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
