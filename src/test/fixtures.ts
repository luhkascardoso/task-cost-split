import type { Session } from '@/data';
import { setSession } from '@/features/auth/session-store';
import { testData } from './test-data';

/** Cria um usuário na fonte de dados de teste e o deixa logado no app. */
export async function signInTestUser(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<Session> {
  const session = await testData.auth.signUp({
    name: 'Lucas Teste',
    email: 'lucas@teste.com',
    password: '123456',
    ...overrides,
  });
  setSession(session);
  return session;
}

/** Retorna o participante "eu" do usuário logado. */
export async function getSelfParticipant() {
  const participants = await testData.participants.list();
  return participants.find((p) => p.isSelf)!;
}
