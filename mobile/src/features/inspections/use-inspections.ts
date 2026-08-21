/**
 * Busca das inspeções do técnico e agrupamento para a tela de início.
 *
 * A API filtra pelo usuário autenticado (`GET /mobile/inspections`, §12.10), e
 * o agrupamento por dia é feito no cliente porque depende do relógio do
 * aparelho — o técnico quer saber o que é "hoje" para ele, em campo.
 */

import { useCallback, useEffect, useState } from 'react';

import { calendarDaysBetween, parseIsoDate } from '@/components';
import { apiClient, type ApiClient } from '@/services';
import { toApiError, type ApiError, type Inspection, type Page } from '@/models';

/** Estados em que ainda se espera trabalho do técnico. */
export const OPEN_STATUSES: readonly Inspection['status'][] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'REJECTED',
];

export interface InspectionGroups {
  today: Inspection[];
  overdue: Inspection[];
  inProgress: Inspection[];
}

/**
 * Uma inspeção pode aparecer em mais de um grupo — uma em andamento agendada
 * para hoje é, ao mesmo tempo, "de hoje" e "em andamento". Os grupos são
 * recortes da mesma lista, não uma partição.
 */
export function groupInspections(
  inspections: readonly Inspection[],
  now: Date = new Date(),
): InspectionGroups {
  const today: Inspection[] = [];
  const overdue: Inspection[] = [];
  const inProgress: Inspection[] = [];

  for (const inspection of inspections) {
    const scheduled = parseIsoDate(inspection.scheduledFor);
    const open = OPEN_STATUSES.includes(inspection.status);

    if (scheduled && calendarDaysBetween(now, scheduled) === 0) today.push(inspection);
    if (scheduled && open && scheduled.getTime() < now.getTime()) overdue.push(inspection);
    if (inspection.status === 'IN_PROGRESS') inProgress.push(inspection);
  }

  return { today, overdue, inProgress };
}

export interface UseInspectionsResult {
  inspections: Inspection[];
  groups: InspectionGroups;
  loading: boolean;
  error: ApiError | null;
  /** Recarregando com a lista ainda na tela — "puxar para atualizar". */
  refreshing: boolean;
  /** Recarrega exibindo o esqueleto. */
  reload: () => void;
  /** Recarrega mantendo a lista visível. */
  refresh: () => void;
}

export interface UseInspectionsOptions {
  client?: ApiClient;
  /** Injetável para teste; em produção é o relógio do aparelho. */
  now?: () => Date;
  /** Página grande: a lista de campo é curta e cabe numa busca só. */
  size?: number;
}

export function useInspections({
  client = apiClient,
  now = () => new Date(),
  size = 100,
}: UseInspectionsOptions = {}): UseInspectionsResult {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /** Incrementar dispara nova busca; é o que `reload`/`refresh` fazem. */
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    // A busca fica dentro do efeito, e não numa função chamada por ele, porque
    // é o efeito que sabe quando a tela saiu — sem isso a resposta atrasada de
    // uma tela desmontada ainda tentaria escrever no estado.
    (async () => {
      try {
        const page = await client.get<Page<Inspection>>('/mobile/inspections', {
          query: { page: 0, size },
        });
        if (!active) return;
        setInspections(page.content ?? []);
        setError(null);
      } catch (thrown) {
        if (!active) return;
        setError(toApiError(thrown));
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [client, size, reloadToken]);

  /** Recarrega exibindo o esqueleto — usado no erro e no estado vazio. */
  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  /** Recarrega mantendo a lista na tela — usado no "puxar para atualizar". */
  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadToken((token) => token + 1);
  }, []);

  return {
    inspections,
    groups: groupInspections(inspections, now()),
    loading,
    error,
    refreshing,
    reload,
    refresh,
  };
}
