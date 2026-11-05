import {
  buildShares,
  formatBRL,
  getExpenseStatus,
  getSummary,
  maskBRLInput,
  parseBRL,
  perPersonAmount,
  splitEvenly,
  type Expense,
  type Participant,
} from '..';

describe('money', () => {
  it('formata centavos em BRL', () => {
    expect(formatBRL(450000)).toBe('R$ 4.500,00');
    expect(formatBRL(36000)).toBe('R$ 360,00');
    expect(formatBRL(8330)).toBe('R$ 83,30');
  });

  it('interpreta texto digitado', () => {
    expect(parseBRL('1.234,56')).toBe(123456);
    expect(parseBRL('R$ 12,00')).toBe(1200);
    expect(parseBRL('50')).toBe(5000);
    expect(parseBRL('')).toBeNull();
    expect(parseBRL('abc')).toBeNull();
  });

  it('aplica máscara centavos-primeiro', () => {
    expect(maskBRLInput('1')).toEqual({ text: '0,01', cents: 1 });
    expect(maskBRLInput('123456')).toEqual({ text: '1.234,56', cents: 123456 });
    expect(maskBRLInput('')).toEqual({ text: '0,00', cents: 0 });
  });
});

describe('split', () => {
  it('divide igualmente e distribui o resto', () => {
    const r = splitEvenly(10000, ['a', 'b', 'c']);
    expect([...r.values()]).toEqual([3334, 3333, 3333]);
    expect([...r.values()].reduce((s, v) => s + v, 0)).toBe(10000);
  });

  it('ignora participantes duplicados', () => {
    expect(splitEvenly(220000, ['a', 'b', 'a']).size).toBe(2);
  });

  it('rejeita lista vazia e valores inválidos', () => {
    expect(() => splitEvenly(100, [])).toThrow();
    expect(() => splitEvenly(10.5, ['a'])).toThrow();
  });

  it('preserva status ao reconstruir cotas', () => {
    const shares = buildShares(30000, ['a', 'b', 'c'], [
      { participantId: 'a', amount: 15000, status: 'paid' },
      { participantId: 'z', amount: 15000, status: 'paid' },
    ]);
    expect(shares).toEqual([
      { participantId: 'a', amount: 10000, status: 'paid' },
      { participantId: 'b', amount: 10000, status: 'pending' },
      { participantId: 'c', amount: 10000, status: 'pending' },
    ]);
  });

  it('calcula valor por pessoa do card', () => {
    expect(perPersonAmount(50000, 6)).toBe(8333);
    expect(perPersonAmount(100, 0)).toBe(0);
  });
});

describe('status', () => {
  it('deriva o status da despesa', () => {
    expect(getExpenseStatus([])).toBe('pending');
    expect(getExpenseStatus([{ status: 'pending' }, { status: 'pending' }])).toBe('pending');
    expect(getExpenseStatus([{ status: 'paid' }, { status: 'pending' }])).toBe('partial');
    expect(getExpenseStatus([{ status: 'paid' }, { status: 'paid' }])).toBe('paid');
  });
});

describe('summary', () => {
  const participants: Participant[] = [
    { id: 'me', name: 'Eu', isSelf: true },
    { id: 'js', name: 'Jonas Santos', isSelf: false },
  ];
  const expenses: Expense[] = [
    {
      id: 'e1',
      activityId: 'a1',
      title: 'Aluguel',
      amount: 220000,
      createdAt: '',
      shares: [
        { participantId: 'me', amount: 110000, status: 'paid' },
        { participantId: 'js', amount: 110000, status: 'pending' },
      ],
    },
    {
      id: 'e2',
      activityId: 'a1',
      title: 'Gasolina',
      amount: 50000,
      createdAt: '',
      shares: [{ participantId: 'me', amount: 50000, status: 'pending' }],
    },
  ];

  it('calcula minhas contas e informações gerais', () => {
    const s = getSummary({
      activities: [{ id: 'a1', title: 'Férias', date: '2025-12-20', createdAt: '' }],
      expenses,
      participants,
    });
    expect(s.mine.paid).toEqual({ amount: 110000, expensesCount: 1 });
    expect(s.mine.pending).toEqual({ amount: 50000, expensesCount: 1 });
    expect(s.general).toEqual({
      total: 270000,
      activitiesCount: 1,
      expensesCount: 2,
      participantsCount: 1,
    });
  });
});
