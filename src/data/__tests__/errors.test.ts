import { DEFAULT_ERROR_MESSAGES, isRecoverableError, toDataError } from '../errors';
import { DataError, type DataErrorCode } from '../types';

describe('isRecoverableError', () => {
  it.each<[DataErrorCode, boolean]>([
    ['network', true],
    ['timeout', true],
    ['server', true],
    ['unauthorized', false],
    ['not_found', false],
    ['conflict', false],
    ['invalid', false],
    ['unknown', false],
  ])('DataError %s → %s', (code, expected) => {
    expect(isRecoverableError(new DataError('x', code))).toBe(expected);
  });

  it('erro que não é DataError não é recuperável', () => {
    expect(isRecoverableError(new Error('boom'))).toBe(false);
    expect(isRecoverableError('boom')).toBe(false);
    expect(isRecoverableError(undefined)).toBe(false);
  });
});

describe('toDataError', () => {
  it('devolve o mesmo DataError', () => {
    const error = new DataError('Despesa não encontrada', 'not_found');
    expect(toDataError(error)).toBe(error);
  });

  it('normaliza qualquer outro erro em DataError unknown, preservando a origem', () => {
    const original = new TypeError('undefined is not a function');
    const error = toDataError(original);
    expect(error).toBeInstanceOf(DataError);
    expect(error.code).toBe('unknown');
    expect(error.message).toBe(DEFAULT_ERROR_MESSAGES.unknown);
    expect(error.original).toBe(original);
  });
});

describe('DataError', () => {
  it('guarda status e erro de origem sem mudar a mensagem', () => {
    const error = new DataError('Serviço indisponível', 'server', { status: 503, original: 'raw' });
    expect(error).toMatchObject({ name: 'DataError', code: 'server', status: 503, original: 'raw' });
    expect(error.message).toBe('Serviço indisponível');
  });

  it('código padrão continua sendo invalid', () => {
    expect(new DataError('Informe um título').code).toBe('invalid');
  });
});
