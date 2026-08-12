/**
 * Tipos e regras de domínio da inspeção, independentes de interface e de
 * infraestrutura (docs/arquitetura.md §11.4).
 *
 * Os nomes seguem docs/modelo-de-dados.md — e não o protótipo, que usava um
 * recorte simplificado ("ok" / "nok" / "na" e um único tipo de item).
 */

/** Tipos de resposta suportados no MVP (docs/aplicativo-mobile.md §13.5). */
export const RESPONSE_TYPES = [
  'TEXT_SHORT',
  'TEXT_LONG',
  'NUMBER',
  'BOOLEAN',
  'CONFORMITY',
  'SINGLE_CHOICE',
  'DATE',
] as const;

export type ResponseType = (typeof RESPONSE_TYPES)[number];

/** RN-023 — o app só renderiza os tipos que conhece. */
export function isSupportedResponseType(value: string): value is ResponseType {
  return (RESPONSE_TYPES as readonly string[]).includes(value);
}

export type Conformity = 'CONFORMING' | 'NON_CONFORMING' | 'NOT_APPLICABLE';

export type InspectionStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Estado local de sincronização, separado do estado de negócio (§10.2). */
export type SyncStatus = 'SYNCED' | 'PENDING' | 'ERROR' | 'CONFLICT';

export interface TemplateItem {
  id: string;
  title: string;
  description?: string | null;
  responseType: ResponseType;
  required: boolean;
  /** RN-038 — exige observação quando a resposta for não conforme. */
  observationRequiredOnFailure?: boolean;
  /** RN-039 — exige evidência quando a resposta for não conforme. */
  evidenceRequiredOnFailure?: boolean;
  /** Alternativas de SINGLE_CHOICE. */
  options?: string[];
  displayOrder: number;
}

export interface Template {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  items: TemplateItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Resposta de um item. Espelha InspectionResponse (§10.8.4): um campo de valor
 * por tipo, em vez de um campo polimórfico.
 */
export interface Answer {
  itemId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
  conformity?: Conformity | null;
  observation?: string | null;
  /** URI local da foto enquanto o upload não foi confirmado (§10.9.1). */
  evidenceUri?: string | null;
  answeredAtDevice?: string | null;
}

export interface Inspection {
  id: string;
  templateId: string;
  templateTitle: string;
  /** Cópia dos itens no momento do agendamento — RN-021. */
  itemsSnapshot: TemplateItem[];
  answers: Answer[];
  equipment?: string | null;
  site?: string | null;
  technician?: string | null;
  priority: Priority;
  status: InspectionStatus;
  syncStatus: SyncStatus;
  scheduledFor?: string | null;
  startedAtDevice?: string | null;
  completedAtDevice?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Uma resposta conta como preenchida quando tem valor para o seu tipo. */
export function isAnswered(item: TemplateItem, answer: Answer | undefined): boolean {
  if (!answer) return false;

  switch (item.responseType) {
    case 'TEXT_SHORT':
    case 'TEXT_LONG':
      return !!answer.valueText?.trim();
    case 'NUMBER':
      return answer.valueNumber !== null && answer.valueNumber !== undefined;
    case 'BOOLEAN':
      return answer.valueBoolean !== null && answer.valueBoolean !== undefined;
    case 'CONFORMITY':
      return !!answer.conformity;
    case 'SINGLE_CHOICE':
      return !!answer.valueText;
    case 'DATE':
      return !!answer.valueDate;
    default:
      return false;
  }
}

export interface PendingIssue {
  itemId: string;
  itemTitle: string;
  reason: string;
}

export interface InspectionSummary {
  total: number;
  answered: number;
  pending: number;
  conforming: number;
  nonConforming: number;
  notApplicable: number;
  /** Percentual de conformidade sobre os itens avaliados (exclui N/A). */
  score: number;
  /** Percentual de preenchimento, usado na barra de progresso. */
  progress: number;
  /** Impedimentos de conclusão — RN-037, RN-038, RN-039. */
  blockers: PendingIssue[];
}

/**
 * Consolida o estado da inspeção.
 *
 * O progresso considera os itens aplicáveis (RN-040) e os bloqueios reúnem as
 * três regras que impedem a conclusão: obrigatório sem resposta (RN-037),
 * não conformidade sem observação (RN-038) e sem evidência (RN-039).
 */
export function summarize(items: TemplateItem[], answers: Answer[]): InspectionSummary {
  const byItem = new Map(answers.map((a) => [a.itemId, a]));
  const blockers: PendingIssue[] = [];

  let answered = 0;
  let conforming = 0;
  let nonConforming = 0;
  let notApplicable = 0;

  for (const item of items) {
    const answer = byItem.get(item.id);
    const done = isAnswered(item, answer);
    if (done) answered += 1;

    if (item.required && !done) {
      blockers.push({
        itemId: item.id,
        itemTitle: item.title,
        reason: 'Item obrigatório sem resposta',
      });
    }

    if (answer?.conformity === 'CONFORMING') conforming += 1;
    if (answer?.conformity === 'NOT_APPLICABLE') notApplicable += 1;

    if (answer?.conformity === 'NON_CONFORMING') {
      nonConforming += 1;

      if (item.observationRequiredOnFailure && !answer.observation?.trim()) {
        blockers.push({
          itemId: item.id,
          itemTitle: item.title,
          reason: 'Não conformidade exige observação',
        });
      }
      if (item.evidenceRequiredOnFailure && !answer.evidenceUri) {
        blockers.push({
          itemId: item.id,
          itemTitle: item.title,
          reason: 'Não conformidade exige evidência',
        });
      }
    }
  }

  const total = items.length;
  const evaluated = conforming + nonConforming;

  return {
    total,
    answered,
    pending: total - answered,
    conforming,
    nonConforming,
    notApplicable,
    score: evaluated ? Math.round((conforming / evaluated) * 100) : 0,
    progress: total ? Math.round((answered / total) * 100) : 0,
    blockers,
  };
}

export const CONFORMITY_LABEL: Record<Conformity, string> = {
  CONFORMING: 'Conforme',
  NON_CONFORMING: 'Não conf.',
  NOT_APPLICABLE: 'N/A',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const STATUS_LABEL: Record<InspectionStatus, string> = {
  DRAFT: 'Rascunho',
  ASSIGNED: 'Atribuída',
  IN_PROGRESS: 'Em andamento',
  SUBMITTED: 'Enviada',
  UNDER_REVIEW: 'Em revisão',
  APPROVED: 'Aprovada',
  REJECTED: 'Reprovada',
  CANCELED: 'Cancelada',
};

export const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  SYNCED: 'Sincronizado',
  PENDING: 'Aguardando envio',
  ERROR: 'Falha no envio',
  CONFLICT: 'Conflito',
};

export const RESPONSE_TYPE_LABEL: Record<ResponseType, string> = {
  TEXT_SHORT: 'Texto curto',
  TEXT_LONG: 'Texto longo',
  NUMBER: 'Número',
  BOOLEAN: 'Sim / Não',
  CONFORMITY: 'Conformidade',
  SINGLE_CHOICE: 'Seleção única',
  DATE: 'Data',
};
