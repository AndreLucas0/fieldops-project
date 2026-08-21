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

export interface UseEvidencesResult {
  evidences: Evidence[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function useEvidences(
  inspectionId: string | undefined,
  client: ApiClient = apiClient,
): UseEvidencesResult {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
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

      try {
        const list = await client.get<Evidence[]>(`/inspections/${inspectionId}/evidence`);
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

  return { evidences, loading, error, reload };
}
