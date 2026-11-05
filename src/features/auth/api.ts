import { useMutation } from '@tanstack/react-query';

import { data } from '@/data';
import { queryClient } from '@/lib/query-client';
import type { SignInInput, SignUpInput } from './schemas';
import { setSession } from './session-store';

// Ao mudar a sessão, o Stack.Protected do root layout troca (auth) ↔ (app) sozinho.

export function useSignIn() {
  return useMutation({
    mutationFn: (input: SignInInput) => data.auth.signIn(input),
    onSuccess: setSession,
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: (input: SignUpInput) => data.auth.signUp(input),
    onSuccess: setSession,
  });
}

export async function signOut() {
  await data.auth.signOut();
  queryClient.clear();
  setSession(null);
}
