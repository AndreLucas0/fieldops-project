/**
 * Não conformidades de uma inspeção (FE-M10).
 *
 * A lista inicial vem no detalhe da inspeção; criação e edição atualizam a
 * lista em memória para a tela refletir na hora, sem recarregar tudo.
 */

import { useCallback, useState } from 'react';

import {
  toApiError,
  type ApiError,
  type NonConformity,
  type NonConformityCreateRequest,
  type NonConformityUpdateRequest,
  type Uuid,
} from '@/models';
import { apiClient, type ApiClient } from '@/services';

import type { NonConformityDraft } from './non-conformity-form';

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
        const body: NonConformityCreateRequest = {
          title: draft.title.trim(),
          description: draft.description.trim(),
          severity: draft.severity,
          createdAtDevice: new Date().toISOString(),
          ...(context.inspectionItemId ? { inspectionItemId: context.inspectionItemId } : {}),
          ...(context.responseId ? { responseId: context.responseId } : {}),
        };

        const created = await client.post<NonConformity>(
          `/inspections/${inspectionId}/non-conformities`,
          body,
        );

        setItems((current) => [...current, created]);
        return created;
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
   * (`docs/telas-frontend.md` §17.3). O endpoint existe no contrato
   * (`PUT /non-conformities/{id}`) e é o que se usa aqui.
   */
  const update = useCallback(
    async (id: Uuid, draft: NonConformityDraft) => {
      setSaving(true);
      setError(null);

      try {
        const body: NonConformityUpdateRequest = {
          title: draft.title.trim(),
          description: draft.description.trim(),
          severity: draft.severity,
        };

        const updated = await client.put<NonConformity>(`/non-conformities/${id}`, body);

        setItems((current) => current.map((item) => (item.id === id ? updated : item)));
        return updated;
      } catch (thrown) {
        setError(toApiError(thrown));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [client],
  );

  const clearError = useCallback(() => setError(null), []);

  return { items, saving, error, create, update, clearError };
}
