/**
 * CONTRATO DE DADOS DO APP.
 *
 * As features só conhecem esta interface — nunca uma implementação concreta.
 * Hoje existe a implementação `mock` (local, AsyncStorage). Quando o backend próprio
 * existir, cria-se `src/data/http/` implementando a mesma interface e troca-se em
 * `src/data/index.ts`. Nenhuma tela ou hook precisa mudar.
 *
 * Regras do contrato (o backend deve respeitar o mesmo):
 *  - Valores monetários em centavos (inteiros).
 *  - Datas de atividade em ISO "YYYY-MM-DD".
 *  - A divisão das cotas é responsabilidade da fonte de dados (o app envia só participantIds).
 *  - Toda operação (exceto auth) é escopada ao usuário logado.
 *  - Erros esperados são lançados como `DataError` com mensagem pronta para a UI.
 */
import type {
  Activity,
  ActivityTotals,
  Cents,
  Expense,
  Participant,
  ShareStatus,
  Summary,
} from '@/domain';

// ---------- Auth ----------

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  user: User;
  /** Token de acesso. No mock é um valor fictício; no HTTP vai no header Authorization. */
  accessToken: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput extends SignInInput {
  name: string;
}

export interface AuthSource {
  /** Sessão persistida no aparelho, ou null. */
  getSession(): Promise<Session | null>;
  signIn(input: SignInInput): Promise<Session>;
  /** Cria a conta e o participante "eu" (isSelf) do usuário. */
  signUp(input: SignUpInput): Promise<Session>;
  signOut(): Promise<void>;
}

// ---------- Recursos ----------

export type ActivityListItem = Activity & ActivityTotals;

export interface ActivityInput {
  title: string;
  /** ISO "YYYY-MM-DD" */
  date: string;
}

export interface ExpenseInput {
  title: string;
  amount: Cents;
  /** Ordem importa: o centavo de resto da divisão vai para os primeiros. */
  participantIds: string[];
}

export type ParticipantListItem = Participant & { activitiesCount: number };

export interface DataSource {
  auth: AuthSource;

  activities: {
    /** Ordenadas por data desc, com totais (card da lista). */
    list(): Promise<ActivityListItem[]>;
    get(id: string): Promise<Activity>;
    create(input: ActivityInput): Promise<Activity>;
    update(id: string, input: ActivityInput): Promise<Activity>;
    /** Remove a atividade e todas as suas despesas. */
    remove(id: string): Promise<void>;
  };

  expenses: {
    /** Ordenadas por criação asc. */
    listByActivity(activityId: string): Promise<Expense[]>;
    get(id: string): Promise<Expense>;
    create(activityId: string, input: ExpenseInput): Promise<Expense>;
    /** Recalcula as cotas preservando o status de quem continua na despesa. */
    update(id: string, input: ExpenseInput): Promise<Expense>;
    setShareStatus(expenseId: string, participantId: string, status: ShareStatus): Promise<Expense>;
    remove(id: string): Promise<void>;
  };

  participants: {
    /** Todos os participantes do usuário, incluindo o "eu" (isSelf). */
    list(): Promise<ParticipantListItem[]>;
    create(name: string): Promise<Participant>;
  };

  summary: {
    get(): Promise<Summary>;
  };
}

/** Erro esperado (credencial inválida, recurso não encontrado, validação…). */
export class DataError extends Error {
  constructor(
    message: string,
    readonly code: 'unauthorized' | 'not_found' | 'conflict' | 'invalid' = 'invalid',
  ) {
    super(message);
    this.name = 'DataError';
  }
}
