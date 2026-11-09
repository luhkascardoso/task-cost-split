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

export interface ActivitiesSource {
  /** Ordenadas por data desc, com totais (card da lista). */
  list(): Promise<ActivityListItem[]>;
  get(id: string): Promise<Activity>;
  create(input: ActivityInput): Promise<Activity>;
  update(id: string, input: ActivityInput): Promise<Activity>;
  /** Remove a atividade e todas as suas despesas. */
  remove(id: string): Promise<void>;
}

export interface ExpensesSource {
  /** Ordenadas por criação asc. */
  listByActivity(activityId: string): Promise<Expense[]>;
  get(id: string): Promise<Expense>;
  create(activityId: string, input: ExpenseInput): Promise<Expense>;
  /** Recalcula as cotas preservando o status de quem continua na despesa. */
  update(id: string, input: ExpenseInput): Promise<Expense>;
  setShareStatus(expenseId: string, participantId: string, status: ShareStatus): Promise<Expense>;
  remove(id: string): Promise<void>;
}

export interface ParticipantsSource {
  /** Todos os participantes do usuário, incluindo o "eu" (isSelf). Ordenados por nome (pt-BR). */
  list(): Promise<ParticipantListItem[]>;
  create(name: string): Promise<Participant>;
}

export interface SummarySource {
  get(): Promise<Summary>;
}

/**
 * Contrato completo, segregado por recurso (ISP). Funções que precisam de um só
 * recurso devem depender da sub-interface (ex.: `ExpensesSource`), não do todo.
 */
export interface DataSource {
  auth: AuthSource;
  activities: ActivitiesSource;
  expenses: ExpensesSource;
  participants: ParticipantsSource;
  summary: SummarySource;
}

/**
 * Códigos de `DataError`.
 * - `unauthorized`, `not_found`, `conflict`, `invalid`: erros de negócio/entrada. Repetir não muda o resultado.
 * - `network`, `timeout`, `server`: falhas transitórias de infraestrutura (o adaptador HTTP as lança).
 *   São as únicas que justificam nova tentativa automática, e só em leituras (docs/05).
 * - `unknown`: qualquer erro não mapeado, normalizado por `toDataError` (src/data/errors.ts).
 */
export type DataErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown';

/**
 * Único tipo de erro que sai da camada de dados. A mensagem já vem pronta para a UI.
 * `status` (HTTP) e `original` (erro de origem) ajudam no diagnóstico e nunca vão para a tela.
 */
export class DataError extends Error {
  readonly status?: number;
  readonly original?: unknown;

  constructor(
    message: string,
    readonly code: DataErrorCode = 'invalid',
    options: { status?: number; original?: unknown } = {},
  ) {
    super(message);
    this.name = 'DataError';
    this.status = options.status;
    this.original = options.original;
  }
}
