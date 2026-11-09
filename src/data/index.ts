import AsyncStorage from '@react-native-async-storage/async-storage';

import { createMockDataSource } from './mock/mock-data-source';
import type { DataSource } from './types';

export * from './types';
export { DEFAULT_ERROR_MESSAGES, isRecoverableError, toDataError } from '@/lib/errors';

/**
 * PONTO ÚNICO DE TROCA da fonte de dados (EXPO_PUBLIC_DATA_SOURCE).
 * Quando o backend existir: implementar `createHttpDataSource` em src/data/http/
 * e adicionar o case 'http' abaixo. Ver docs/04-camada-de-dados.md.
 */
function createDataSource(): DataSource {
  const kind = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';
  switch (kind) {
    case 'mock':
      return createMockDataSource({ storage: AsyncStorage });
    default:
      throw new Error(
        `EXPO_PUBLIC_DATA_SOURCE="${kind}" não suportado. Use "mock" (o adaptador HTTP ainda não existe).`,
      );
  }
}

export const data: DataSource = createDataSource();
