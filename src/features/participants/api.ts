import { useMutation, useQuery } from '@tanstack/react-query';

import { data } from '@/data';
import { queryClient, queryKeys } from '@/lib/query-client';

export type { ParticipantListItem } from '@/data';

/**
 * Participantes do usuário + "Em N atividades".
 * Inclui o participante "eu" (isSelf) — a tela Participantes o filtra,
 * mas o seletor de participantes da despesa o mostra como "Você".
 */
export function useParticipants() {
  return useQuery({
    queryKey: queryKeys.participants.all,
    queryFn: () => data.participants.list(),
  });
}

/** Cria um participante novo a partir do nome digitado no seletor da despesa. */
export function useCreateParticipant() {
  return useMutation({
    mutationFn: (name: string) => data.participants.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.participants.all }),
  });
}
