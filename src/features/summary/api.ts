import { useQuery } from '@tanstack/react-query';

import { data } from '@/data';
import { queryKeys } from '@/lib/query-client';

/** Tela Resumo ("Minhas contas" + "Informações gerais"). */
export function useSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => data.summary.get(),
  });
}
