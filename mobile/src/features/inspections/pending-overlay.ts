/**
 * Alterações ainda no outbox, aplicadas sobre o que veio do servidor (ou do
 * cache). Enquanto não sincroniza, o aparelho é a verdade sobre o que o técnico
 * fez: "o banco local não deve ser tratado apenas como cache descartável
 * enquanto existirem alterações pendentes" (`aplicativo-mobile.md`).
 *
 * Funções puras: recebem as linhas do outbox, devolvem uma cópia ajustada.
 */

import type {
  Evidence,
  Inspection,
  InspectionDetail,
  InspectionResponse,
  InspectionStatus,
  NonConformity,
  Severity,
} from '@/models';
import type { OutboxRow } from '@/services/local-db';

type Payload = Record<string, unknown>;

function parse(row: OutboxRow): Payload | null {
  try {
    const value: unknown = JSON.parse(row.payload);
    return value !== null && typeof value === 'object' ? (value as Payload) : null;
  } catch {
    return null;
  }
}

function inOrder(rows: OutboxRow[]): OutboxRow[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Prefixo do id dado a uma resposta que só existe no outbox. */
export const LOCAL_RESPONSE_PREFIX = 'local-';

export function isLocalResponseId(id: string): boolean {
  return id.startsWith(LOCAL_RESPONSE_PREFIX);
}

/**
 * Fotos ainda no outbox somadas às evidências do servidor, cada uma ligada à
 * resposta do seu item (inclusive a resposta `local-…`). Sem isso, um item com
 * evidência obrigatória bloquearia a conclusão offline mesmo com a foto tirada.
 */
export function withPendingEvidences(
  evidences: readonly Evidence[],
  rows: OutboxRow[],
  responses: readonly InspectionResponse[],
): Evidence[] {
  const pending = inOrder(rows)
    .filter((row) => row.entity_type === 'EVIDENCE')
    .flatMap((row): Evidence[] => {
      const payload = parse(row);
      if (!payload) return [];
      const itemId = asString(payload.inspectionItemId);
      const responseId =
        asString(payload.responseId) ??
        (itemId
          ? (responses.find((response) => response.inspectionItemId === itemId)?.id ?? null)
          : null);
      const capturedAt = asString(payload.capturedAtDevice) ?? row.created_at;
      return [
        {
          id: row.entity_id,
          inspectionId: row.inspection_id,
          responseId,
          nonConformityId: asString(payload.nonConformityId),
          type: 'PHOTO',
          mimeType: 'image/jpeg',
          sizeBytes: 0,
          description: asString(payload.description),
          capturedAtDevice: capturedAt,
          createdAt: capturedAt,
        },
      ];
    });

  return [...evidences, ...pending];
}

export function applyPendingToDetail(
  detail: InspectionDetail,
  rows: OutboxRow[],
): InspectionDetail {
  const relevant = rows.filter((row) => row.inspection_id === detail.id);
  if (relevant.length === 0) return detail;

  const result: InspectionDetail = {
    ...detail,
    responses: [...(detail.responses ?? [])],
    nonConformities: [...(detail.nonConformities ?? [])],
  };

  for (const row of inOrder(relevant)) {
    const payload = parse(row);
    if (!payload) continue;

    switch (row.entity_type) {
      case 'INSPECTION':
        applyTransition(result, payload);
        break;
      case 'INSPECTION_RESPONSE':
        result.responses = mergeResponse(result.responses ?? [], row, payload);
        break;
      case 'NON_CONFORMITY':
        result.nonConformities = mergeNonConformity(result.nonConformities ?? [], row, payload);
        break;
      default:
        // EVIDENCE: a foto pendente não altera o detalhe.
        break;
    }
  }

  return result;
}

export function applyPendingToList(list: Inspection[], rows: OutboxRow[]): Inspection[] {
  const transitions = inOrder(rows).filter((row) => row.entity_type === 'INSPECTION');
  if (transitions.length === 0) return list;

  return list.map((inspection) => {
    const own = transitions.filter((row) => row.entity_id === inspection.id);
    if (own.length === 0) return inspection;
    const result = { ...inspection };
    for (const row of own) {
      const payload = parse(row);
      if (payload) applyTransition(result, payload);
    }
    return result;
  });
}

function applyTransition(target: Inspection, payload: Payload): void {
  const status = asString(payload.status);
  if (status) target.status = status as InspectionStatus;
  const started = asString(payload.startedAtDevice);
  if (started) target.startedAtDevice = started;
  const completed = asString(payload.completedAtDevice);
  if (completed) target.completedAtDevice = completed;
}

/**
 * A versão segue a do outbox: cada gravação local parte da versão conhecida e o
 * servidor soma um ao aplicar. Assim uma nova edição offline usa a mesma base
 * que o servidor terá, sem conflito artificial.
 */
function mergeResponse(
  responses: InspectionResponse[],
  row: OutboxRow,
  payload: Payload,
): InspectionResponse[] {
  const itemId = row.entity_id;
  const existing = responses.find((response) => response.inspectionItemId === itemId);

  const merged: InspectionResponse = {
    ...(existing ?? {
      id: `${LOCAL_RESPONSE_PREFIX}${itemId}`,
      inspectionItemId: itemId,
      createdAt: row.created_at,
    }),
    // Escolha única viaja em valueChoice no contrato de sync; a tela lê valueText.
    valueText: asString(payload.valueChoice) ?? asString(payload.valueText),
    valueNumber: typeof payload.valueNumber === 'number' ? payload.valueNumber : null,
    valueBoolean: typeof payload.valueBoolean === 'boolean' ? payload.valueBoolean : null,
    valueDate: asString(payload.valueDate),
    observation: asString(payload.observation),
    conformity:
      (asString(payload.conformity) as InspectionResponse['conformity']) ?? existing?.conformity,
    answeredAtDevice: existing?.answeredAtDevice ?? row.created_at,
    updatedAt: row.created_at,
    version: row.base_version + 1,
  } as InspectionResponse;

  return existing
    ? responses.map((response) => (response === existing ? merged : response))
    : [...responses, merged];
}

function mergeNonConformity(
  list: NonConformity[],
  row: OutboxRow,
  payload: Payload,
): NonConformity[] {
  const existing = list.find((item) => item.id === row.entity_id);
  const title = asString(payload.title) ?? existing?.title ?? '';
  const description = asString(payload.description) ?? existing?.description ?? '';
  const severity = (asString(payload.severity) ?? existing?.severity ?? 'LOW') as Severity;

  if (existing) {
    const edited = { ...existing, title, description, severity, updatedAt: row.created_at };
    return list.map((item) => (item === existing ? edited : item));
  }

  const createdAt = asString(payload.createdAtDevice) ?? row.created_at;
  return [
    ...list,
    {
      id: row.entity_id,
      inspectionId: row.inspection_id,
      inspectionItemId: asString(payload.snapshotId),
      responseId: null,
      title,
      description,
      severity,
      status: 'OPEN',
      createdAtDevice: createdAt,
      serverReceivedAt: null,
      createdAt,
      updatedAt: row.created_at,
      version: 0,
    },
  ];
}
