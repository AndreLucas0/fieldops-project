/**
 * Leitura e escrita da resposta de um item do checklist.
 *
 * Concentra aqui o que o contrato deixa em aberto, para o componente de
 * interface não precisar adivinhar formato.
 */

import type { Conformity, InspectionItemSnapshot, InspectionResponse, JsonObject } from '@/models';

/**
 * Valor corrente de um item — o subconjunto de
 * `InspectionResponseUpsertRequest` que a tela de checklist edita.
 */
export interface ChecklistValue {
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
  valueJson?: JsonObject | null;
  observation?: string | null;
  conformity?: Conformity;
}

/**
 * Regras de preenchimento do item.
 *
 * `InspectionItemSnapshot` não traz `observationRequiredOnFailure` e
 * `evidenceRequiredOnFailure` como campos próprios — no contrato
 * (`openapi.yaml`) esses sinalizadores do `TemplateItem` são copiados para
 * `rulesJson` no momento do agendamento. A leitura tolerante deixa o app
 * pronto caso o backend passe a enviá-los na raiz.
 */
export interface ChecklistRules {
  observationRequiredOnFailure: boolean;
  evidenceRequiredOnFailure: boolean;
}

function readBoolean(source: JsonObject | null | undefined, key: string): boolean {
  return source?.[key] === true;
}

export function readChecklistRules(item: InspectionItemSnapshot): ChecklistRules {
  const rules = item.rulesJson ?? null;
  const root = item as unknown as JsonObject;

  return {
    observationRequiredOnFailure:
      readBoolean(rules, 'observationRequiredOnFailure') ||
      readBoolean(root, 'observationRequiredOnFailure'),
    evidenceRequiredOnFailure:
      readBoolean(rules, 'evidenceRequiredOnFailure') ||
      readBoolean(root, 'evidenceRequiredOnFailure'),
  };
}

export interface ChoiceOption {
  value: string;
  label: string;
}

/**
 * Alternativas de `SINGLE_CHOICE`.
 *
 * TODO: PEND-03 — o contrato não define o formato de `optionsJson`. Formato
 * temporário adotado: `{ options: [{ value, label }] }`. Uma lista de strings
 * também é aceita enquanto o formato não é fechado.
 */
export function readChoiceOptions(item: InspectionItemSnapshot): ChoiceOption[] {
  const raw = item.optionsJson?.['options'] ?? item.optionsJson?.['choices'];
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): ChoiceOption[] => {
    if (typeof entry === 'string') return [{ value: entry, label: entry }];

    if (typeof entry === 'object' && entry !== null) {
      const option = entry as { value?: unknown; label?: unknown };
      const value = typeof option.value === 'string' ? option.value : null;
      if (!value) return [];
      return [{ value, label: typeof option.label === 'string' ? option.label : value }];
    }

    return [];
  });
}

/** Extrai da resposta guardada o valor que os campos editam. */
export function toChecklistValue(response: InspectionResponse | undefined): ChecklistValue {
  if (!response) return {};

  return {
    valueText: response.valueText ?? null,
    valueNumber: response.valueNumber ?? null,
    valueBoolean: response.valueBoolean ?? null,
    valueDate: response.valueDate ?? null,
    valueJson: response.valueJson ?? null,
    observation: response.observation ?? null,
    ...(response.conformity ? { conformity: response.conformity } : {}),
  };
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** O item recebeu alguma resposta — o indicador "✓" da lista. */
export function isAnswered(item: InspectionItemSnapshot, value: ChecklistValue): boolean {
  switch (item.responseType) {
    case 'TEXT_SHORT':
    case 'TEXT_LONG':
    case 'SINGLE_CHOICE':
      return hasText(value.valueText);
    case 'NUMBER':
      return typeof value.valueNumber === 'number' && Number.isFinite(value.valueNumber);
    case 'BOOLEAN':
      return typeof value.valueBoolean === 'boolean';
    case 'DATE':
      return hasText(value.valueDate);
    case 'CONFORMITY':
      return value.conformity != null;
    default:
      return false;
  }
}

/**
 * O item está pronto para envio.
 *
 * Mais estrito que `isAnswered`: um item não conforme cuja regra exige
 * observação continua pendente enquanto a observação estiver vazia (RN-038).
 * A validação local espelha o `422` do servidor para não gastar uma ida à API.
 */
export function isComplete(item: InspectionItemSnapshot, value: ChecklistValue): boolean {
  if (!isAnswered(item, value)) return false;

  if (requiresObservation(item, value) && !hasText(value.observation)) return false;

  return true;
}

/** A observação virou obrigatória para o valor atual. */
export function requiresObservation(
  item: InspectionItemSnapshot,
  value: ChecklistValue,
): boolean {
  return (
    value.conformity === 'NON_CONFORMING' && readChecklistRules(item).observationRequiredOnFailure
  );
}

/** A evidência fotográfica virou obrigatória para o valor atual. */
export function requiresEvidence(item: InspectionItemSnapshot, value: ChecklistValue): boolean {
  return (
    value.conformity === 'NON_CONFORMING' && readChecklistRules(item).evidenceRequiredOnFailure
  );
}

/** Quantos itens obrigatórios ainda faltam — alimenta a barra de progresso. */
export function countAnswered(
  items: readonly InspectionItemSnapshot[],
  responses: readonly InspectionResponse[],
): number {
  const byItem = new Map(responses.map((response) => [response.inspectionItemId, response]));
  return items.filter((item) => isAnswered(item, toChecklistValue(byItem.get(item.id)))).length;
}
