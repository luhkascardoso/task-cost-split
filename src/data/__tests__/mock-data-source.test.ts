import { createMockDataSource, type KeyValueStorage } from '../mock/mock-data-source';
import { DataError } from '../types';

function memoryStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
  };
}

async function setup() {
  const storage = memoryStorage();
  const ds = createMockDataSource({ storage, latencyMs: 0 });
  const session = await ds.auth.signUp({ name: 'Lucas', email: 'Lucas@Ex.com', password: '123456' });
  return { ds, storage, session };
}

describe('mock data source', () => {
  it('cadastro cria sessão e participante "eu"', async () => {
    const { ds, session } = await setup();
    expect(session.user).toMatchObject({ name: 'Lucas', email: 'lucas@ex.com' });
    const participants = await ds.participants.list();
    expect(participants).toEqual([
      expect.objectContaining({ name: 'Lucas', isSelf: true, activitiesCount: 0 }),
    ]);
  });

  it('login valida credenciais e e-mail duplicado', async () => {
    const { ds } = await setup();
    await ds.auth.signOut();
    await expect(ds.auth.signIn({ email: 'lucas@ex.com', password: 'errada' })).rejects.toBeInstanceOf(DataError);
    await expect(
      ds.auth.signUp({ name: 'X', email: 'lucas@ex.com', password: '123456' }),
    ).rejects.toThrow('já está cadastrado');
    await expect(ds.auth.signIn({ email: 'LUCAS@ex.com', password: '123456' })).resolves.toBeTruthy();
  });

  it('exige sessão para acessar dados', async () => {
    const { ds } = await setup();
    await ds.auth.signOut();
    await expect(ds.activities.list()).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('fluxo completo: atividade → despesa → pagamento → resumo', async () => {
    const { ds } = await setup();
    const me = (await ds.participants.list())[0]!;
    const jonas = await ds.participants.create('Jonas Santos');
    const activity = await ds.activities.create({ title: 'Férias de verão', date: '2025-12-20' });

    const expense = await ds.expenses.create(activity.id, {
      title: 'Aluguel da casa',
      amount: 220000,
      participantIds: [me.id, jonas.id],
    });
    expect(expense.shares.map((s) => s.amount)).toEqual([110000, 110000]);

    await ds.expenses.setShareStatus(expense.id, me.id, 'paid');

    const [listed] = await ds.activities.list();
    expect(listed).toMatchObject({ total: 220000, expensesCount: 1 });
    expect(listed!.participantIds).toHaveLength(2);

    const summary = await ds.summary.get();
    expect(summary.mine.paid).toEqual({ amount: 110000, expensesCount: 1 });
    expect(summary.general).toMatchObject({ total: 220000, participantsCount: 1 });

    const jonasItem = (await ds.participants.list()).find((p) => p.id === jonas.id);
    expect(jonasItem?.activitiesCount).toBe(1);
  });

  it('editar despesa preserva status de quem continua', async () => {
    const { ds } = await setup();
    const me = (await ds.participants.list())[0]!;
    const a = await ds.participants.create('Ana');
    const b = await ds.participants.create('Bia');
    const activity = await ds.activities.create({ title: 'Jantar', date: '2025-10-15' });
    const expense = await ds.expenses.create(activity.id, {
      title: 'Pizza',
      amount: 10000,
      participantIds: [me.id, a.id],
    });
    await ds.expenses.setShareStatus(expense.id, a.id, 'paid');

    const updated = await ds.expenses.update(expense.id, {
      title: 'Pizza',
      amount: 10000,
      participantIds: [a.id, b.id, me.id],
    });
    expect(updated.shares).toEqual([
      { participantId: a.id, amount: 3334, status: 'paid' },
      { participantId: b.id, amount: 3333, status: 'pending' },
      { participantId: me.id, amount: 3333, status: 'pending' },
    ]);
  });

  it('excluir atividade remove suas despesas', async () => {
    const { ds } = await setup();
    const me = (await ds.participants.list())[0]!;
    const activity = await ds.activities.create({ title: 'Show', date: '2025-10-30' });
    const expense = await ds.expenses.create(activity.id, { title: 'Ingresso', amount: 5000, participantIds: [me.id] });
    await ds.activities.remove(activity.id);
    await expect(ds.expenses.get(expense.id)).rejects.toMatchObject({ code: 'not_found' });
    expect((await ds.summary.get()).general.expensesCount).toBe(0);
  });

  it('persiste no storage e isola usuários', async () => {
    const { storage } = await setup();
    const reopened = createMockDataSource({ storage, latencyMs: 0 });
    expect((await reopened.auth.getSession())?.user.name).toBe('Lucas');
    await reopened.activities.create({ title: 'Da Lucas', date: '2025-01-01' });

    await reopened.auth.signUp({ name: 'Outra', email: 'outra@ex.com', password: '123456' });
    expect(await reopened.activities.list()).toEqual([]);
  });
});
