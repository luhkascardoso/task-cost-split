import { Redirect } from 'expo-router';

import { useSessionStore } from '@/features/auth/session-store';

/**
 * Rota "/" — ponto de entrada (é a URL que o app abre por padrão).
 * Fica FORA dos grupos protegidos para sempre existir, e só redireciona
 * para o grupo certo conforme a sessão.
 */
export default function Index() {
  const isLoggedIn = useSessionStore((s) => !!s.session);
  return <Redirect href={isLoggedIn ? '/activities' : '/sign-in'} />;
}
