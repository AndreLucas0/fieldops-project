/**
 * Banco fictício do modo mock — adaptador sobre o conjunto compartilhado.
 *
 * Os dados em si vivem em `shared/src/mocks`, junto com o contrato, para que o
 * aplicativo e a interface administrativa demonstrem exatamente a mesma
 * operação: o mesmo gerador, o mesmo checklist, os mesmos identificadores.
 *
 * Este arquivo existe para preservar os nomes que o backend fictício e os
 * testes já usam (`getMockDatabase`, `MockDatabase`), sem espalhar o caminho do
 * pacote compartilhado por toda a camada de serviço.
 */

import {
  createMockStore,
  getMockStore,
  resetMockStore,
  type MockStore,
  type User,
} from '@fieldops/shared';

export {
  MOCK_PASSWORDS,
  MOCK_TOKEN_TTL_SECONDS,
  nextMockId,
  USER_IDS,
  CLIENT_IDS,
  SITE_IDS,
  EQUIPMENT_IDS,
  INSPECTION_IDS,
  NON_CONFORMITY_IDS,
} from '@fieldops/shared';

/** Conta de demonstração: é o próprio `User` do contrato. */
export type MockAccount = User;

export type MockDatabase = MockStore;

export const createMockDatabase = createMockStore;
export const getMockDatabase = getMockStore;
export const resetMockDatabase = resetMockStore;
