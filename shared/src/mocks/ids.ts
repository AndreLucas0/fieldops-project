/**
 * Identificadores fixos do conjunto fictício.
 *
 * São UUID v4 válidos (dígito de versão `4`, variante `8`) e **estáveis**: o
 * mesmo registro tem o mesmo id no aplicativo e na interface administrativa,
 * o que permite conferir um fluxo de ponta a ponta nos dois lados. O prefixo
 * indica a entidade, para facilitar a leitura em log e teste.
 */

import type { Uuid } from '../domain';

const uuid = (prefix: string, index: number): Uuid =>
  `${prefix}0000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

export const USER_IDS = {
  admin: uuid('1000', 1),
  supervisor: uuid('1000', 2),
  technician: uuid('1000', 3),
  /** Conta inativa — existe para o login recusá-la (RN-001). */
  inactive: uuid('1000', 4),
} as const;

export const CLIENT_IDS = {
  alfa: uuid('2000', 1),
  beta: uuid('2000', 2),
} as const;

export const SITE_IDS = {
  plantaSaoPaulo: uuid('3000', 1),
  filialCampinas: uuid('3000', 2),
  sedeRio: uuid('3000', 3),
} as const;

export const EQUIPMENT_IDS = {
  gerador: uuid('4000', 1),
  compressor: uuid('4000', 2),
  bomba: uuid('4000', 3),
  elevador: uuid('4000', 4),
} as const;

export const TEMPLATE_IDS = {
  seguranca: uuid('5000', 1),
  eletrico: uuid('5000', 2),
} as const;

export const TEMPLATE_VERSION_IDS = {
  segurancaV1: uuid('5100', 1),
} as const;

export const INSPECTION_IDS = {
  assigned: uuid('6000', 1),
  inProgress: uuid('6000', 2),
  submitted: uuid('6000', 3),
  underReview: uuid('6000', 4),
  approved: uuid('6000', 5),
  rejected: uuid('6000', 6),
} as const;

export const NON_CONFORMITY_IDS = {
  low: uuid('7000', 1),
  high: uuid('7000', 2),
  critical: uuid('7000', 3),
} as const;

/** Gerador para registros criados em tempo de execução (mutações do mock). */
let runtimeSequence = 0;

export function nextMockId(prefix = 'ffff'): Uuid {
  runtimeSequence += 1;
  return uuid(prefix, runtimeSequence);
}

export function resetMockIdSequence(): void {
  runtimeSequence = 0;
}

/** Ids derivados de forma determinística a partir de um pai (itens, respostas). */
export function childId(prefix: string, parentIndex: number, childIndex: number): Uuid {
  return uuid(prefix, parentIndex * 100 + childIndex);
}
