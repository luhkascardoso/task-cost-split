import { create } from 'zustand';

import { data, type Session } from '@/data';

/**
 * Estado global de autenticação. É o ÚNICO estado global de cliente do app —
 * dados de domínio ficam no React Query (ver docs/01-arquitetura.md).
 */
interface SessionState {
  session: Session | null;
  /** false até a sessão persistida ser lida. */
  initialized: boolean;
}

export const useSessionStore = create<SessionState>(() => ({
  session: null,
  initialized: false,
}));

export const setSession = (session: Session | null) =>
  useSessionStore.setState({ session, initialized: true });

let started = false;

/** Chamado uma vez no root layout: restaura a sessão salva no aparelho. */
export function restoreSession() {
  if (started) return;
  started = true;
  data.auth
    .getSession()
    .then(setSession)
    .catch(() => setSession(null));
}

export function useSession() {
  return useSessionStore((s) => s.session);
}
