/**
 * Modelos de domínio — independentes de banco, UI e rede.
 * Valores monetários são SEMPRE inteiros em centavos (ver docs/05-regras-de-negocio.md).
 */

export type Cents = number;

export type ShareStatus = 'pending' | 'paid';

/** Status agregado de uma despesa, derivado das cotas. */
export type ExpenseStatus = 'pending' | 'partial' | 'paid';

export interface Participant {
  id: string;
  name: string;
  /** true para o participante que representa o próprio usuário logado. */
  isSelf: boolean;
}

export interface ExpenseShare {
  participantId: string;
  amount: Cents;
  status: ShareStatus;
}

export interface Expense {
  id: string;
  activityId: string;
  title: string;
  amount: Cents;
  shares: ExpenseShare[];
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  /** Data ISO (YYYY-MM-DD). */
  date: string;
  createdAt: string;
}
