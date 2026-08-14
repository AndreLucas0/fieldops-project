/**
 * Nomes de cliente e local das inspeções listadas.
 *
 * `GET /mobile/inspections` devolve só `clientId` e `siteId` (`openapi.yaml`
 * §Inspection), mas o cartão da lista precisa mostrar onde é o serviço. Este
 * hook resolve os nomes uma vez por identificador distinto — não por inspeção.
 *
 * Falha em qualquer consulta é ignorada de propósito: o cartão apenas omite a
 * linha do local. Um técnico sem permissão de leitura no cadastro
 * (`docs/perfis-de-usuario.md` §5.3) continua vendo a lista.
 *
 * TODO: quando o contrato incluir os nomes no envelope da listagem, este hook
 * deixa de ser necessário.
 */

import { useEffect, useMemo, useState } from 'react';

import type { Client, Inspection, InspectionSite } from '@/models';
import { apiClient, type ApiClient } from '@/services';

export interface PlaceNames {
  clients: ReadonlyMap<string, string>;
  sites: ReadonlyMap<string, string>;
}

const EMPTY: PlaceNames = { clients: new Map(), sites: new Map() };

function distinct(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

export function usePlaceNames(
  inspections: readonly Inspection[],
  client: ApiClient = apiClient,
): PlaceNames {
  const [names, setNames] = useState<PlaceNames>(EMPTY);

  const clientIds = useMemo(
    () => distinct(inspections.map((inspection) => inspection.clientId)),
    [inspections],
  );
  const siteIds = useMemo(
    () => distinct(inspections.map((inspection) => inspection.siteId)),
    [inspections],
  );

  // Chaves textuais: a identidade do array muda a cada busca, mas o conteúdo
  // quase nunca muda — comparar por conteúdo evita recarregar à toa.
  const clientKey = clientIds.join(',');
  const siteKey = siteIds.join(',');

  useEffect(() => {
    let active = true;

    (async () => {
      const [clientEntries, siteEntries] = await Promise.all([
        resolveAll(clientIds, (id) => client.get<Client>(`/clients/${id}`)),
        resolveAll(siteIds, (id) => client.get<InspectionSite>(`/sites/${id}`)),
      ]);

      if (!active) return;
      setNames({ clients: new Map(clientEntries), sites: new Map(siteEntries) });
    })();

    return () => {
      active = false;
    };
    // `clientIds`/`siteIds` entram pela chave textual, não pela identidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, clientKey, siteKey]);

  return names;
}

/** Consulta em paralelo, descartando o que falhar. */
async function resolveAll<T extends { name: string }>(
  ids: readonly string[],
  fetchOne: (id: string) => Promise<T>,
): Promise<[string, string][]> {
  const results = await Promise.all(
    ids.map(async (id): Promise<[string, string] | null> => {
      try {
        const record = await fetchOne(id);
        return [id, record.name];
      } catch {
        return null;
      }
    }),
  );

  return results.filter((entry): entry is [string, string] => entry !== null);
}
