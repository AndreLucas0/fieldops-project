/**
 * O que ainda impede concluir a inspeção (FE-M09).
 *
 * As três regras que travam o envio vêm do checklist, não do servidor: item
 * obrigatório sem resposta, item não conforme sem a observação exigida
 * (RN-038) e item não conforme sem a evidência exigida. Validar aqui evita o
 * `422` garantido — e, em campo, uma ida à rede que falharia.
 */

import {
  isAnswered,
  requiresEvidence,
  requiresObservation,
  toChecklistValue,
  type ChecklistValue,
} from '@/components';
import type {
  Evidence,
  InspectionItemSnapshot,
  InspectionResponse,
  NonConformity,
  Uuid,
} from '@/models';

export type BlockerReason = 'missing-answer' | 'missing-observation' | 'missing-evidence';

export interface CompletionBlocker {
  item: InspectionItemSnapshot;
  reason: BlockerReason;
}

export const BLOCKER_LABELS: Record<BlockerReason, string> = {
  'missing-answer': 'Sem resposta',
  'missing-observation': 'Falta a observação',
  'missing-evidence': 'Falta a evidência',
};

export interface CompletionSummary {
  totalItems: number;
  answeredItems: number;
  requiredItems: number;
  blockers: CompletionBlocker[];
  nonConformities: number;
  evidences: number;
  /** `true` quando nada impede o envio. */
  canSubmit: boolean;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Avalia a inspeção inteira. Cada item aparece no máximo uma vez na lista de
 * pendências, com o primeiro motivo encontrado — resolver um de cada vez é
 * mais claro que mostrar três avisos sobre a mesma linha.
 */
export function evaluateCompletion(
  items: readonly InspectionItemSnapshot[],
  responses: readonly InspectionResponse[],
  evidences: readonly Evidence[],
  nonConformities: readonly NonConformity[],
): CompletionSummary {
  const byItem = new Map<Uuid, InspectionResponse>(
    responses.map((response) => [response.inspectionItemId, response]),
  );

  // Evidências ligadas à resposta — é assim que o contrato as vincula ao item.
  const evidencesByResponse = new Set(
    evidences.map((evidence) => evidence.responseId).filter(Boolean),
  );

  const blockers: CompletionBlocker[] = [];
  let answeredItems = 0;

  for (const item of items) {
    const response = byItem.get(item.id);
    const value: ChecklistValue = toChecklistValue(response);
    const answered = isAnswered(item, value);

    if (answered) answeredItems += 1;

    if (item.required && !answered) {
      blockers.push({ item, reason: 'missing-answer' });
      continue;
    }

    if (requiresObservation(item, value) && !hasText(value.observation)) {
      blockers.push({ item, reason: 'missing-observation' });
      continue;
    }

    if (requiresEvidence(item, value) && !(response && evidencesByResponse.has(response.id))) {
      blockers.push({ item, reason: 'missing-evidence' });
    }
  }

  return {
    totalItems: items.length,
    answeredItems,
    requiredItems: items.filter((item) => item.required).length,
    blockers,
    nonConformities: nonConformities.length,
    evidences: evidences.length,
    canSubmit: blockers.length === 0 && items.length > 0,
  };
}
