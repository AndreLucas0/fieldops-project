/**
 * Agrupamento do checklist em seções (FE-M08).
 *
 * O snapshot vem como lista plana de itens, cada um carregando o título e a
 * ordem da seção a que pertence (`openapi.yaml` §InspectionItemSnapshot). A
 * tela precisa da estrutura em dois níveis.
 */

import { isAnswered, isComplete, toChecklistValue, type ChecklistValue } from '@/components';
import type { InspectionItemSnapshot, InspectionResponse, Uuid } from '@/models';

export interface ChecklistSection {
  /** Chave estável da seção — `sectionOrder` mais o título. */
  key: string;
  title: string;
  description: string | null;
  order: number;
  items: InspectionItemSnapshot[];
}

/** Agrupa por seção e ordena seções e itens pela ordem do modelo. */
export function groupBySection(
  items: readonly InspectionItemSnapshot[],
): ChecklistSection[] {
  const sections = new Map<string, ChecklistSection>();

  for (const item of items) {
    const key = `${item.sectionOrder}:${item.sectionTitle}`;
    const existing = sections.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    sections.set(key, {
      key,
      title: item.sectionTitle,
      description: item.sectionDescription ?? null,
      order: item.sectionOrder,
      items: [item],
    });
  }

  const ordered = [...sections.values()].sort((a, b) => a.order - b.order);
  for (const section of ordered) {
    section.items.sort((a, b) => a.itemOrder - b.itemOrder);
  }
  return ordered;
}

/** Índice de respostas por item, para leitura direta na renderização. */
export function indexResponses(
  responses: readonly InspectionResponse[],
): Map<Uuid, InspectionResponse> {
  return new Map(responses.map((response) => [response.inspectionItemId, response]));
}

export interface SectionProgress {
  answered: number;
  total: number;
}

export function sectionProgress(
  section: ChecklistSection,
  values: ReadonlyMap<Uuid, ChecklistValue>,
): SectionProgress {
  const answered = section.items.filter((item) =>
    isAnswered(item, values.get(item.id) ?? {}),
  ).length;

  return { answered, total: section.items.length };
}

/**
 * Itens obrigatórios que ainda impedem o envio.
 *
 * Usa `isComplete`, não `isAnswered`: um item não conforme sem a observação
 * exigida continua pendente (RN-038).
 */
export function pendingRequiredItems(
  sections: readonly ChecklistSection[],
  values: ReadonlyMap<Uuid, ChecklistValue>,
): InspectionItemSnapshot[] {
  return sections
    .flatMap((section) => section.items)
    .filter((item) => item.required && !isComplete(item, values.get(item.id) ?? {}));
}

/** Estado inicial dos valores editáveis, a partir das respostas já gravadas. */
export function initialValues(
  responses: readonly InspectionResponse[],
): Map<Uuid, ChecklistValue> {
  return new Map(
    responses.map((response) => [response.inspectionItemId, toChecklistValue(response)]),
  );
}
