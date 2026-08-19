/**
 * Banco fictício em memória.
 *
 * Guarda o conjunto de dados e as mutações feitas durante a execução: criar um
 * cliente na web ou responder um item no aplicativo altera este objeto e a tela
 * reflete na hora. Nada é persistido — recarregar devolve o estado semeado.
 */

import type {
  DashboardSummary,
  InspectionStatus,
  SeverityCount,
  Severity,
  StatusCount,
  Uuid,
} from '../domain';
import { INSPECTION_STATUSES, SEVERITIES } from '../domain';
import { createMockDataset, type MockDataset } from './dataset';
import { resetMockIdSequence } from './ids';

export interface MockStore extends MockDataset {
  /** Token de acesso válido → id do usuário. */
  accessTokens: Map<string, Uuid>;
  refreshTokens: Map<string, Uuid>;
}

export function createMockStore(now: number = Date.now()): MockStore {
  resetMockIdSequence();

  return {
    ...createMockDataset(now),
    accessTokens: new Map<string, Uuid>(),
    refreshTokens: new Map<string, Uuid>(),
  };
}

let store: MockStore | null = null;

export function getMockStore(): MockStore {
  store ??= createMockStore();
  return store;
}

/** Devolve o banco ao estado semeado — usado entre testes. */
export function resetMockStore(now?: number): MockStore {
  store = createMockStore(now);
  return store;
}

// ------------------------------------------------------------- mutações

export interface Versioned {
  id: Uuid;
  updatedAt?: string;
  version?: number;
}

export function findById<T extends { id: Uuid }>(items: readonly T[], id: Uuid): T | undefined {
  return items.find((item) => item.id === id);
}

/** Insere no início: o registro recém-criado aparece no topo da lista. */
export function insertEntity<T extends { id: Uuid }>(items: T[], entity: T): T {
  items.unshift(entity);
  return entity;
}

/**
 * Aplica a alteração e avança o controle otimista.
 *
 * O `version` precisa subir aqui porque a próxima edição envia o valor lido
 * como `baseVersion`; sem o incremento, o mock nunca reproduziria o 409 de
 * conflito que o servidor real devolve (RN-075).
 */
export function updateEntity<T extends Versioned>(
  items: T[],
  id: Uuid,
  patch: Partial<T>,
  now: number = Date.now(),
): T | undefined {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return undefined;

  const current = items[index];
  const updated: T = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date(now).toISOString(),
    version: (current.version ?? 0) + 1,
  };

  items[index] = updated;
  return updated;
}

export function removeEntity<T extends { id: Uuid }>(items: T[], id: Uuid): T | undefined {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return undefined;
  return items.splice(index, 1)[0];
}

// ----------------------------------------------------------- indicadores

/** Estados em que a inspeção já saiu das mãos do técnico. */
const CLOSED_STATUSES: readonly InspectionStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELED',
];

export function isOverdue(
  scheduledFor: string,
  status: InspectionStatus,
  now: number = Date.now(),
): boolean {
  if (CLOSED_STATUSES.includes(status)) return false;
  return Date.parse(scheduledFor) < now;
}

/**
 * Indicadores derivados dos dados, nunca escritos à mão: assim o painel não
 * pode discordar da lista que o usuário vê ao lado.
 */
export function dashboardSummary(
  source: MockStore = getMockStore(),
  now: number = Date.now(),
): DashboardSummary {
  const { inspections, nonConformities } = source;
  const countBy = (status: InspectionStatus): number =>
    inspections.filter((inspection) => inspection.status === status).length;

  return {
    totalInspections: inspections.length,
    inspectionsInProgress: countBy('IN_PROGRESS'),
    inspectionsPendingReview: countBy('SUBMITTED'),
    inspectionsOverdue: inspections.filter((inspection) =>
      isOverdue(inspection.scheduledFor, inspection.status, now),
    ).length,
    inspectionsApproved: countBy('APPROVED'),
    inspectionsRejected: countBy('REJECTED'),
    nonConformitiesOpen: nonConformities.filter((nc) => nc.status === 'OPEN').length,
  };
}

export function inspectionsByStatus(source: MockStore = getMockStore()): StatusCount[] {
  return INSPECTION_STATUSES.map((status) => ({
    status,
    count: source.inspections.filter((inspection) => inspection.status === status).length,
  })).filter((entry) => entry.count > 0);
}

export function nonConformitiesBySeverity(source: MockStore = getMockStore()): SeverityCount[] {
  return SEVERITIES.map((severity: Severity) => ({
    severity,
    count: source.nonConformities.filter((nc) => nc.severity === severity).length,
  })).filter((entry) => entry.count > 0);
}
