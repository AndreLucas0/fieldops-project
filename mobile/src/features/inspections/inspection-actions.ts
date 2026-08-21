/**
 * Que ação a tela de detalhe oferece em cada estado da inspeção.
 *
 * A tabela vem de `docs/telas-frontend.md` §17.1 (ações por estado). Isto é
 * conveniência de interface: a API valida a transição de novo a cada chamada
 * (`docs/perfis-de-usuario.md` §5.3), e um `start` fora de hora responde `409`.
 */

import type { InspectionReview, InspectionStatus, Uuid } from '@/models';

export type InspectionAction = 'start' | 'continue' | 'fix';

export interface ActionDescriptor {
  action: InspectionAction;
  label: string;
  hint: string;
}

const ACTIONS: Partial<Record<InspectionStatus, ActionDescriptor>> = {
  ASSIGNED: {
    action: 'start',
    label: 'Iniciar',
    hint: 'Confirma o início e registra a localização',
  },
  IN_PROGRESS: {
    action: 'continue',
    label: 'Continuar',
    hint: 'Abre o checklist onde você parou',
  },
  REJECTED: {
    action: 'fix',
    label: 'Corrigir',
    hint: 'Abre o checklist nos itens apontados pelo supervisor',
  },
};

/** `null` significa somente leitura. */
export function primaryAction(status: InspectionStatus): ActionDescriptor | null {
  return ACTIONS[status] ?? null;
}

export function isReadOnly(status: InspectionStatus): boolean {
  return primaryAction(status) === null;
}

/** A recusa mais recente — é dela que saem os itens a corrigir. */
export function latestRejection(
  reviews: readonly InspectionReview[] | undefined,
): InspectionReview | null {
  const rejections = (reviews ?? []).filter((review) => review.decision === 'REJECTED');
  if (rejections.length === 0) return null;

  return rejections.reduce((latest, review) =>
    review.reviewCycle > latest.reviewCycle ? review : latest,
  );
}

/**
 * Itens que o supervisor pediu para corrigir.
 *
 * `RejectInspectionRequest` aceita `itemsToCorrect`, mas `InspectionReview` não
 * devolve o campo (`openapi.yaml` §InspectionReview) — a leitura é tolerante
 * para funcionar assim que o servidor passar a enviá-lo, sem quebrar enquanto
 * não envia.
 *
 * TODO: fechar no contrato como a lista de itens a corrigir volta ao aplicativo.
 */
export function readItemsToCorrect(review: InspectionReview | null): Uuid[] {
  if (!review) return [];

  const raw = (review as unknown as Record<string, unknown>)['itemsToCorrect'];
  if (!Array.isArray(raw)) return [];

  return raw.filter((value): value is string => typeof value === 'string');
}
