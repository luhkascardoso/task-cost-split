import { z } from 'zod';

/** Formulário "Nova despesa" (Título, R$, Participantes). */
export const expenseFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe um título'),
  amount: z.number().int().positive('Informe um valor'),
  participantIds: z.array(z.string()).min(1, 'Adicione pelo menos um participante'),
});
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
