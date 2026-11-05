/**
 * Implementação LOCAL do DataSource — sem servidor.
 * Guarda tudo num único JSON no AsyncStorage. Serve para desenvolver as telas
 * enquanto o backend não existe. NÃO é segura (senha em texto puro): só dev.
 */
import {
  buildShares,
  getActivityTotals,
  getExpenseInputError,
  getParticipantNameError,
  getSummary,
  type Activity,
  type Expense,
  type Participant,
} from '@/domain';
import {
  DataError,
  type ActivityInput,
  type DataSource,
  type ExpenseInput,
  type Session,
  type User,
} from '../types';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

type Owned<T> = T & { ownerId: string };

interface MockDb {
  version: 1;
  users: (User & { password: string })[];
  participants: Owned<Participant>[];
  activities: Owned<Activity>[];
  expenses: Expense[];
  sessionUserId: string | null;
}

const STORAGE_KEY = 'taskcost:mockdb:v1';

const emptyDb = (): MockDb => ({
  version: 1,
  users: [],
  participants: [],
  activities: [],
  expenses: [],
  sessionUserId: null,
});

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createMockDataSource({
  storage,
  latencyMs = 250,
}: {
  storage: KeyValueStorage;
  /** Atraso artificial para exercitar estados de loading. 0 nos testes. */
  latencyMs?: number;
}): DataSource {
  let cache: MockDb | null = null;

  async function load(): Promise<MockDb> {
    if (cache) return cache;
    const raw = await storage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as MockDb) : emptyDb();
    return cache;
  }

  /** Executa uma operação com latência simulada e persiste se houver escrita. */
  async function run<T>(fn: (db: MockDb) => T, { write = false } = {}): Promise<T> {
    if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs));
    const db = await load();
    const result = fn(db);
    if (write) await storage.setItem(STORAGE_KEY, JSON.stringify(db));
    // Clona para que a UI nunca mute o "banco" por referência.
    // (JSON em vez de structuredClone: os dados são JSON puro e funciona em qualquer engine.)
    return result === undefined ? result : (JSON.parse(JSON.stringify(result)) as T);
  }

  function currentUserId(db: MockDb): string {
    if (!db.sessionUserId) throw new DataError('Sessão expirada', 'unauthorized');
    return db.sessionUserId;
  }

  function sessionFor(user: User): Session {
    return { user: { id: user.id, name: user.name, email: user.email }, accessToken: `mock-${user.id}` };
  }

  function findActivity(db: MockDb, id: string): Owned<Activity> {
    const ownerId = currentUserId(db);
    const activity = db.activities.find((a) => a.id === id && a.ownerId === ownerId);
    if (!activity) throw new DataError('Atividade não encontrada', 'not_found');
    return activity;
  }

  function findExpense(db: MockDb, id: string): Expense {
    const expense = db.expenses.find((e) => e.id === id);
    if (!expense) throw new DataError('Despesa não encontrada', 'not_found');
    findActivity(db, expense.activityId); // garante posse
    return expense;
  }

  function myExpenses(db: MockDb): Expense[] {
    const ownerId = currentUserId(db);
    const mine = new Set(db.activities.filter((a) => a.ownerId === ownerId).map((a) => a.id));
    return db.expenses.filter((e) => mine.has(e.activityId));
  }

  /** Regras de negócio vêm do domínio; aqui fica só a checagem de posse (persistência). */
  function validateExpense(db: MockDb, input: ExpenseInput) {
    const ownerId = currentUserId(db);
    const error = getExpenseInputError(input);
    if (error) throw new DataError(error);
    for (const pid of input.participantIds) {
      if (!db.participants.some((p) => p.id === pid && p.ownerId === ownerId)) {
        throw new DataError('Participante inválido');
      }
    }
  }

  const strip = <T extends { ownerId: string }>({ ownerId: _ownerId, ...rest }: T) => rest;

  return {
    auth: {
      getSession: () =>
        run((db) => {
          const user = db.users.find((u) => u.id === db.sessionUserId);
          return user ? sessionFor(user) : null;
        }),

      signIn: ({ email, password }) =>
        run(
          (db) => {
            const user = db.users.find((u) => u.email === email.trim().toLowerCase());
            if (!user || user.password !== password) {
              throw new DataError('E-mail ou senha inválidos', 'unauthorized');
            }
            db.sessionUserId = user.id;
            return sessionFor(user);
          },
          { write: true },
        ),

      signUp: ({ name, email, password }) =>
        run(
          (db) => {
            const normalized = email.trim().toLowerCase();
            if (db.users.some((u) => u.email === normalized)) {
              throw new DataError('Este e-mail já está cadastrado', 'conflict');
            }
            const user = { id: newId(), name: name.trim(), email: normalized, password };
            db.users.push(user);
            db.participants.push({ id: newId(), ownerId: user.id, name: user.name, isSelf: true });
            db.sessionUserId = user.id;
            return sessionFor(user);
          },
          { write: true },
        ),

      signOut: () =>
        run(
          (db) => {
            db.sessionUserId = null;
          },
          { write: true },
        ),
    },

    activities: {
      list: () =>
        run((db) => {
          const ownerId = currentUserId(db);
          return db.activities
            .filter((a) => a.ownerId === ownerId)
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
            .map((a) => ({
              ...strip(a),
              ...getActivityTotals(db.expenses.filter((e) => e.activityId === a.id)),
            }));
        }),

      get: (id) => run((db) => strip(findActivity(db, id))),

      create: (input: ActivityInput) =>
        run(
          (db) => {
            const activity = {
              id: newId(),
              ownerId: currentUserId(db),
              title: input.title.trim(),
              date: input.date,
              createdAt: new Date().toISOString(),
            };
            db.activities.push(activity);
            return strip(activity);
          },
          { write: true },
        ),

      update: (id, input) =>
        run(
          (db) => {
            const activity = findActivity(db, id);
            activity.title = input.title.trim();
            activity.date = input.date;
            return strip(activity);
          },
          { write: true },
        ),

      remove: (id) =>
        run(
          (db) => {
            findActivity(db, id);
            db.activities = db.activities.filter((a) => a.id !== id);
            db.expenses = db.expenses.filter((e) => e.activityId !== id);
          },
          { write: true },
        ),
    },

    expenses: {
      listByActivity: (activityId) =>
        run((db) => {
          findActivity(db, activityId);
          return db.expenses
            .filter((e) => e.activityId === activityId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        }),

      get: (id) => run((db) => findExpense(db, id)),

      create: (activityId, input) =>
        run(
          (db) => {
            findActivity(db, activityId);
            validateExpense(db, input);
            const expense: Expense = {
              id: newId(),
              activityId,
              title: input.title.trim(),
              amount: input.amount,
              shares: buildShares(input.amount, input.participantIds),
              createdAt: new Date().toISOString(),
            };
            db.expenses.push(expense);
            return expense;
          },
          { write: true },
        ),

      update: (id, input) =>
        run(
          (db) => {
            const expense = findExpense(db, id);
            validateExpense(db, input);
            expense.title = input.title.trim();
            expense.amount = input.amount;
            expense.shares = buildShares(input.amount, input.participantIds, expense.shares);
            return expense;
          },
          { write: true },
        ),

      setShareStatus: (expenseId, participantId, status) =>
        run(
          (db) => {
            const expense = findExpense(db, expenseId);
            const share = expense.shares.find((s) => s.participantId === participantId);
            if (!share) throw new DataError('Participante não está nesta despesa', 'not_found');
            share.status = status;
            return expense;
          },
          { write: true },
        ),

      remove: (id) =>
        run(
          (db) => {
            findExpense(db, id);
            db.expenses = db.expenses.filter((e) => e.id !== id);
          },
          { write: true },
        ),
    },

    participants: {
      list: () =>
        run((db) => {
          const ownerId = currentUserId(db);
          const expenses = myExpenses(db);
          return db.participants
            .filter((p) => p.ownerId === ownerId)
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
            .map((p) => ({
              ...strip(p),
              activitiesCount: new Set(
                expenses
                  .filter((e) => e.shares.some((s) => s.participantId === p.id))
                  .map((e) => e.activityId),
              ).size,
            }));
        }),

      create: (name) =>
        run(
          (db) => {
            const error = getParticipantNameError(name);
            if (error) throw new DataError(error);
            const participant = { id: newId(), ownerId: currentUserId(db), name: name.trim(), isSelf: false };
            db.participants.push(participant);
            return strip(participant);
          },
          { write: true },
        ),
    },

    summary: {
      get: () =>
        run((db) => {
          const ownerId = currentUserId(db);
          return getSummary({
            activities: db.activities.filter((a) => a.ownerId === ownerId),
            expenses: myExpenses(db),
            participants: db.participants.filter((p) => p.ownerId === ownerId),
          });
        }),
    },
  };
}
