import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { signOut } from '@/features/auth/api';
import { colors } from '@/theme';

/**
 * Rota só para E2E (Maestro): encerra a sessão sem apagar o AsyncStorage.
 * Assim o usuário criado no cadastro continua existindo para o próximo flow fazer login.
 * Deep link: taskcostsplit://e2e-sign-out
 */
export default function E2ESignOutScreen() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await signOut();
      if (!cancelled) router.replace('/sign-in');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}
