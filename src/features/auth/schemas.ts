import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2, 'Informe seu nome'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;
