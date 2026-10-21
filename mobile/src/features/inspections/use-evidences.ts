/**
 * Evidências de uma inspeção.
 *
 * `GET /mobile/inspections/{id}` não traz as evidências no envelope
 * (`openapi.yaml` §InspectionDetail lista `items`, `responses`,
 * `nonConformities` e `reviews`), então elas vêm de
 * `GET /inspections/{id}/evidence`.
 */

import { useCallback, useEffect, useState } from 'react';

import { toApiError, type ApiError, type Evidence } from '@/models';
import { apiClient, type ApiClient } from '@/services';
import { getPendingEntries, type OutboxRow } from '@/services/local-db';
import { cachedGet } from '@/services/offline-cache';

export interface UseEvidencesResult {
  evidences: Evidence[];
  /** Fotos ainda no outbox (EVIDENCE): contam para a conclusão, sem miniatura. */
  pending: OutboxRow[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function useEvidences(
  inspectionId: string | undefined,
  client: ApiClient = apiClient,
): UseEvidencesResult {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [pending, setPending] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!inspectionId) {
        if (active) setLoading(false);
        return;
      }

      // O outbox é local: lido mesmo quando o servidor (ou o cache) falha.
      const queued = await getPendingEntries(inspectionId).catch(() => []);
      if (!active) return;
      setPending(queued.filter((row) => row.entity_type === 'EVIDENCE'));

      try {
        const list = await cachedGet<Evidence[]>(client, `/inspections/${inspectionId}/evidence`);
        if (!active) return;
        setEvidences(Array.isArray(list) ? list : []);
        setError(null);
      } catch (thrown) {
        // A ausência das evidências não impede o resumo de aparecer; ela só
        // deixa a contagem em zero, e a regra de evidência obrigatória avisa.
        if (active) setError(toApiError(thrown));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [client, inspectionId, reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  return { evidences, pending, loading, error, reload };
}
