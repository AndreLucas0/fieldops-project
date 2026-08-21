/**
 * Detalhe de uma inspeção, com os nomes de cliente, local e equipamento
 * resolvidos.
 *
 * `GET /mobile/inspections/{id}` devolve o snapshot do checklist e as
 * respostas, mas identifica cliente, local e equipamento só por id — os nomes
 * são buscados à parte e falham em silêncio (o mesmo tratamento de
 * `use-place-names`, aqui para uma inspeção só).
 */

import { useCallback, useEffect, useState } from 'react';

import { countAnswered } from '@/components';
import {
  toApiError,
  type ApiError,
  type Client,
  type Equipment,
  type InspectionDetail,
  type InspectionSite,
} from '@/models';
import { apiClient, type ApiClient } from '@/services';

export interface InspectionPlaces {
  clientName: string | null;
  siteName: string | null;
  equipmentName: string | null;
}

export interface InspectionProgress {
  answered: number;
  total: number;
}

export interface UseInspectionDetailResult {
  inspection: InspectionDetail | null;
  places: InspectionPlaces;
  progress: InspectionProgress;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

const NO_PLACES: InspectionPlaces = { clientName: null, siteName: null, equipmentName: null };

async function nameOf<T extends { name: string }>(load: () => Promise<T>): Promise<string | null> {
  try {
    return (await load()).name;
  } catch {
    // Cadastro indisponível ou sem permissão: a tela mostra o que já tem.
    return null;
  }
}

export function useInspectionDetail(
  inspectionId: string | undefined,
  client: ApiClient = apiClient,
): UseInspectionDetailResult {
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [places, setPlaces] = useState<InspectionPlaces>(NO_PLACES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!inspectionId) {
        if (active) {
          setError(
            toApiError(new Error('Inspeção não informada. Volte à lista e tente de novo.')),
          );
          setLoading(false);
        }
        return;
      }

      try {
        const detail = await client.get<InspectionDetail>(
          `/mobile/inspections/${inspectionId}`,
        );
        if (!active) return;
        setInspection(detail);
        setError(null);

        // Os nomes chegam depois do detalhe de propósito: a tela já pode
        // renderizar sem eles.
        const [clientName, siteName, equipmentName] = await Promise.all([
          nameOf(() => client.get<Client>(`/clients/${detail.clientId}`)),
          nameOf(() => client.get<InspectionSite>(`/sites/${detail.siteId}`)),
          detail.equipmentId
            ? nameOf(() => client.get<Equipment>(`/equipment/${detail.equipmentId}`))
            : Promise.resolve(null),
        ]);

        if (!active) return;
        setPlaces({ clientName, siteName, equipmentName });
      } catch (thrown) {
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

  const items = inspection?.items ?? [];
  const responses = inspection?.responses ?? [];

  return {
    inspection,
    places,
    // RN-040: o progresso é calculado no cliente, cruzando snapshot e respostas.
    progress: { answered: countAnswered(items, responses), total: items.length },
    loading,
    error,
    reload,
  };
}
