import { z } from 'zod';

import { parseShortDate } from '@/lib/date';

/** Formulário "Nova atividade" / "Editar atividade" (Título + Data). */
export const activityFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe um título'),
  date: z
    .string()
    .refine((v) => parseShortDate(v) !== null, 'Data inválida (dd/mm/aa)'),
});
export type ActivityFormInput = z.infer<typeof activityFormSchema>;
