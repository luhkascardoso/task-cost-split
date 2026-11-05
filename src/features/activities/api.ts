import { useMutation, useQuery } from '@tanstack/react-query';

import { data } from '@/data';
import { parseShortDate } from '@/lib/date';
import { queryClient, queryKeys } from '@/lib/query-client';
import type { ActivityFormInput } from './schemas';

export type { ActivityListItem } from '@/data';

/** Lista de atividades com totais (card: valor, data, nº pessoas, nº despesas). */
export function useActivities() {
  return useQuery({
    queryKey: queryKeys.activities.all,
    queryFn: () => data.activities.list(),
  });
}

export function useActivity(activityId: string) {
  return useQuery({
    queryKey: queryKeys.activities.detail(activityId),
    queryFn: () => data.activities.get(activityId),
  });
}

export function useSaveActivity(activityId?: string) {
  return useMutation({
    mutationFn: async (input: ActivityFormInput) => {
      const payload = { title: input.title.trim(), date: parseShortDate(input.date)! };
      const activity = activityId
        ? await data.activities.update(activityId, payload)
        : await data.activities.create(payload);
      return activity.id;
    },
    onSuccess: invalidateActivities,
  });
}

export function useDeleteActivity() {
  return useMutation({
    mutationFn: (activityId: string) => data.activities.remove(activityId),
    onSuccess: invalidateActivities,
  });
}

function invalidateActivities() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.activities.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.summary }),
    queryClient.invalidateQueries({ queryKey: queryKeys.participants.all }),
  ]);
}
