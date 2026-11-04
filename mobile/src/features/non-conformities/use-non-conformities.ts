/**
 * Não conformidades de uma inspeção (FE-M10).
 *
 * A lista inicial vem no detalhe da inspeção. Criar e editar são offline-first
 * (SYNC-OUTBOX-NC, `contrato-backend-frontend.md` §11.3): a NC é gravada no
 * outbox como `NON_CONFORMITY`, aparece na lista na hora e sobe no
 * `POST /mobile/sync/push`. O id é gerado no aparelho e aceito pelo servidor,
 * então a NC mostrada offline é a mesma depois de sincronizar.
 */

import { randomUUID } from 'expo-crypto';
import { useCallback, useState } from 'react';

import { settleQueuedOperation } from '@/features/inspections/inspection-outbox';
import { ApiError, toApiError, type NonConformity, type Uuid } from '@/models';
import { apiClient, type ApiClient } from '@/services';
import { upsertOutboxEntry } from '@/services/local-db';

import type { NonConformityDraft } from './non-conformity-form';

export const NON_CONFORMITY_ENTITY_TYPE = 'NON_CONFORMITY';

export interface CreateContext {
  inspectionItemId?: Uuid | null;
  responseId?: Uuid | null;
}

export interface UseNonConformitiesResult {
  items: NonConformity[];
  saving: boolean;
  error: ApiError | null;
  create: (draft: NonConformityDraft, context?: CreateContext) => Promise<NonConformity | null>;
  update: (id: Uuid, draft: NonConformityDraft) => Promise<NonConformity | null>;
  clearError: () => void;
}

/** Grava a NC no outbox; o payload segue `NonConformitySyncPayload` do backend. */
async function queueNonConformity(item: NonConformity): Promise<string> {
  const operationId = randomUUID();
  await upsertOutboxEntry({
    id: operationId,
    inspectionId: item.inspectionId,
    entityType: NON_CONFORMITY_ENTITY_TYPE,
    entityId: item.id,
    operationType: 'UPSERT',
    baseVersion: 0,
    payload: JSON.stringify({
      inspectionId: item.inspectionId,
      title: item.title,
      description: item.description,
      severity: item.severity,
      // O backend vincula a NC ao snapshot (F10): o que a tela chama de
      // `responseId` é o id do snapshot do item.
      snapshotId: item.inspectionItemId ?? null,
      createdAtDevice: item.createdAtDevice,
    }),
  });
  return operationId;
}

function rejection(message: string): ApiError {
  return new ApiError({
    timestamp: new Date().toISOString(),
    status: 409,
    code: 'SYNC_REJECTED',
    message,
  });
}

export function useNonConformities(
  inspectionId: string | undefined,
  initial: readonly NonConformity[],
  client: ApiClient = apiClient,
): UseNonConformitiesResult {
  const [items, setItems] = useState<NonConformity[]>(() => [...initial]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // A lista do servidor chega junto com o detalhe; quando ele é recarregado, a
  // identidade do array muda e o estado local volta a acompanhar.
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setItems([...initial]);
  }

  const create = useCallback(
    async (draft: NonConformityDraft, context: CreateContext = {}) => {
      if (!inspectionId) return null;

      setSaving(true);
      setError(null);

      try {
        const now = new Date().toISOString();
        const local: NonConformity = {
          id: randomUUID(),
          inspectionId,
          inspectionItemId: context.responseId ?? null,
          responseId: null,
          title: draft.title.trim(),
          description: draft.description.trim(),
          severity: draft.severity,
          status: 'OPEN',
          createdAtDevice: now,
          serverReceivedAt: null,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };

        const operationId = await queueNonConformity(local);
        setItems((current) => [...current, local]);

        const outcome = await settleQueuedOperation(client, inspectionId, operationId);
        if (outcome.state === 'rejected') {
          setItems((current) => current.filter((item) => item.id !== local.id));
          setError(rejection(outcome.message));
          return null;
        }
        return local;
      } catch (thrown) {
        setError(toApiError(thrown));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [client, inspectionId],
  );

  /**
   * TODO: PEND-06 — a edição de não conformidade não está fechada no MVP
   * (`docs/telas-frontend.md` §17.3). Também passa pelo outbox: o servidor
   * reconhece o id existente e aplica como edição.
   */
  const update = useCallback(
    async (id: Uuid, draft: NonConformityDraft) => {
      const previous = items.find((item) => item.id === id);
      if (!inspectionId || !previous) return null;

      setSaving(true);
      setError(null);

      try {
        const edited: NonConformity = {
          ...previous,
          title: draft.title.trim(),
          description: draft.description.trim(),
          severity: draft.severity,
          updatedAt: new Date().toISOString(),
        };

        const operationId = await queueNonConformity(edited);
        setItems((current) => current.map((item) => (item.id === id ? edited : item)));

        const outcome = await settleQueuedOperation(client, inspectionId, operationId);
        if (outcome.state === 'rejected') {
          setItems((current) => current.map((item) => (item.id === id ? previous : item)));
          setError(rejection(outcome.message));
          return null;
        }
        return edited;
      } catch (thrown) {
        setError(toApiError(thrown));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [client, inspectionId, items],
  );

  const clearError = useCallback(() => setError(null), []);

  return { items, saving, error, create, update, clearError };
}
