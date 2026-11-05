import { useMemo } from 'react';

import { useParticipants } from './api';

/** Mapa participantId → nome ("Você" para o próprio usuário). */
export function useParticipantNames() {
  const { data } = useParticipants();
  return useMemo(
    () => new Map((data ?? []).map((p) => [p.id, p.isSelf ? 'Você' : p.name])),
    [data],
  );
}
