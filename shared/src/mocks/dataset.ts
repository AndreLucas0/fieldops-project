/**
 * Conjunto fictício do FieldOps — fonte única para os dois clientes.
 *
 * Regras que este arquivo respeita, porque dado incoerente esconde bug de tela:
 * todo local pertence a um cliente (RN-009), todo equipamento a um local
 * (RN-010), o local da inspeção é compatível com o equipamento (RN-014), toda
 * inspeção aponta para uma versão publicada de modelo (RN-024) e a não
 * conformidade crítica tem descrição e evidência (RN-055).
 *
 * As datas são relativas a `now`, então o conjunto nunca envelhece: a inspeção
 * agendada continua sendo amanhã em qualquer dia de execução.
 */

import type {
  Client,
  Equipment,
  Evidence,
  Inspection,
  InspectionItemSnapshot,
  InspectionResponse,
  InspectionReview,
  InspectionSite,
  InspectionTemplate,
  InspectionTemplateVersionDetail,
  NonConformity,
  ResponseType,
  TemplateItem,
  TemplateSectionDetail,
  User,
  Uuid,
} from '../domain';
import {
  CLIENT_IDS,
  EQUIPMENT_IDS,
  INSPECTION_IDS,
  NON_CONFORMITY_IDS,
  SITE_IDS,
  TEMPLATE_IDS,
  TEMPLATE_VERSION_IDS,
  USER_IDS,
  childId,
} from './ids';

/** Senhas aceitas por qualquer conta no modo fictício. */
export const MOCK_PASSWORDS: readonly string[] = ['FieldOps@2026', 'fieldops123'];

/** Duração do access token fictício, igual ao `expiresIn` do contrato. */
export const MOCK_TOKEN_TTL_SECONDS = 900;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function iso(base: number, offsetMs: number): string {
  return new Date(base + offsetMs).toISOString();
}

function isoDate(base: number, offsetMs: number): string {
  return new Date(base + offsetMs).toISOString().slice(0, 10);
}

/**
 * Revisão com os itens a corrigir.
 *
 * `RejectInspectionRequest` aceita `itemsToCorrect`, mas `InspectionReview` não
 * devolve o campo no contrato atual (pendência registrada em
 * `ESTADO-DO-PROJETO.md`). O conjunto fictício já o envia para que a tela de
 * correção possa ser exercitada antes de o servidor passar a mandá-lo.
 */
export type MockInspectionReview = InspectionReview & { itemsToCorrect?: Uuid[] };

export interface MockDataset {
  users: User[];
  clients: Client[];
  sites: InspectionSite[];
  equipment: Equipment[];
  templates: InspectionTemplate[];
  /** Somente versões publicadas — o modelo em rascunho não tem nenhuma. */
  templateVersions: InspectionTemplateVersionDetail[];
  /** Seções do modelo em rascunho, que o construtor da web edita (FE-W15). */
  draftSections: Record<Uuid, TemplateSectionDetail[]>;
  inspections: Inspection[];
  /** Snapshot do checklist por inspeção (§10.8.3). */
  items: Record<Uuid, InspectionItemSnapshot[]>;
  responses: Record<Uuid, InspectionResponse[]>;
  evidence: Record<Uuid, Evidence[]>;
  nonConformities: NonConformity[];
  reviews: MockInspectionReview[];
}

// ---------------------------------------------------------------- usuários

function buildUsers(now: number): User[] {
  const createdAt = iso(now, -220 * DAY);
  const updatedAt = iso(now, -30 * DAY);

  return [
    {
      id: USER_IDS.admin,
      name: 'Ana Administradora',
      email: 'admin@fieldops.local',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+55 11 98888-1001',
      createdAt,
      updatedAt,
      version: 1,
    },
    {
      id: USER_IDS.supervisor,
      name: 'Marina Supervisora',
      email: 'supervisor@fieldops.local',
      role: 'SUPERVISOR',
      status: 'ACTIVE',
      phone: '+55 11 98888-2002',
      createdAt,
      updatedAt,
      version: 1,
    },
    {
      id: USER_IDS.technician,
      name: 'Carlos Técnico',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
      phone: '+55 11 98888-3003',
      createdAt,
      updatedAt,
      version: 1,
    },
    // Fora da especificação do conjunto, mantida de propósito: é a conta que
    // permite demonstrar a recusa de login por usuário inativo (RN-001).
    {
      id: USER_IDS.inactive,
      name: 'Joana Inativa',
      email: 'inativo@fieldops.local',
      role: 'TECHNICIAN',
      status: 'INACTIVE',
      phone: null,
      createdAt,
      updatedAt: iso(now, -10 * DAY),
      version: 2,
    },
  ];
}

// ------------------------------------------------- clientes, locais, ativos

function buildClients(now: number): Client[] {
  return [
    {
      id: CLIENT_IDS.alfa,
      name: 'Indústria Alfa',
      legalName: 'Indústria Alfa S.A.',
      document: '12.345.678/0001-90',
      email: 'manutencao@alfa.example',
      phone: '+55 11 4002-8922',
      status: 'ACTIVE',
      createdAt: iso(now, -300 * DAY),
      updatedAt: iso(now, -40 * DAY),
      version: 1,
    },
    {
      id: CLIENT_IDS.beta,
      name: 'Empresa Beta',
      legalName: 'Beta Serviços Prediais Ltda.',
      document: '98.765.432/0001-10',
      email: 'facilities@beta.example',
      phone: '+55 21 3003-4004',
      status: 'ACTIVE',
      createdAt: iso(now, -250 * DAY),
      updatedAt: iso(now, -35 * DAY),
      version: 1,
    },
  ];
}

function buildSites(now: number): InspectionSite[] {
  const createdAt = iso(now, -240 * DAY);
  const updatedAt = iso(now, -25 * DAY);

  return [
    {
      id: SITE_IDS.plantaSaoPaulo,
      clientId: CLIENT_IDS.alfa,
      name: 'Planta São Paulo',
      description: 'Unidade fabril principal.',
      addressLine: 'Av. das Indústrias, 1500',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '04001-000',
      latitude: -23.5505,
      longitude: -46.6333,
      contactName: 'Eduardo Prado',
      contactPhone: '+55 11 99777-3030',
      status: 'ACTIVE',
      createdAt,
      updatedAt,
      version: 1,
    },
    {
      id: SITE_IDS.filialCampinas,
      clientId: CLIENT_IDS.alfa,
      name: 'Filial Campinas',
      description: 'Centro de distribuição regional.',
      addressLine: 'Rod. Dom Pedro I, km 87',
      city: 'Campinas',
      state: 'SP',
      postalCode: '13050-000',
      latitude: -22.9099,
      longitude: -47.0626,
      contactName: 'Sandra Melo',
      contactPhone: '+55 19 99666-4040',
      status: 'ACTIVE',
      createdAt,
      updatedAt,
      version: 1,
    },
    {
      id: SITE_IDS.sedeRio,
      clientId: CLIENT_IDS.beta,
      name: 'Sede Rio',
      description: 'Edifício administrativo.',
      addressLine: 'Av. Rio Branco, 200',
      city: 'Rio de Janeiro',
      state: 'RJ',
      postalCode: '20040-002',
      latitude: -22.9035,
      longitude: -43.1785,
      contactName: 'Paulo Ribeiro',
      contactPhone: '+55 21 99555-5050',
      status: 'ACTIVE',
      createdAt,
      updatedAt,
      version: 1,
    },
  ];
}

function buildEquipment(now: number): Equipment[] {
  const createdAt = iso(now, -200 * DAY);
  const updatedAt = iso(now, -20 * DAY);

  return [
    {
      id: EQUIPMENT_IDS.gerador,
      siteId: SITE_IDS.plantaSaoPaulo,
      name: 'Gerador GD-001',
      assetNumber: 'PAT-000001',
      serialNumber: 'GD001-2021-4471',
      manufacturer: 'Stemac',
      model: 'ST-450',
      description: 'Gerador de emergência do bloco A.',
      qrCode: 'GD001',
      status: 'ACTIVE',
      installedAt: isoDate(now, -900 * DAY),
      createdAt,
      updatedAt,
      version: 1,
    },
    {
      id: EQUIPMENT_IDS.compressor,
      siteId: SITE_IDS.plantaSaoPaulo,
      name: 'Compressor CP-002',
      assetNumber: 'PAT-000002',
      serialNumber: 'CP002-2019-8842',
      manufacturer: 'Atlas Copco',
      model: 'GA-75',
      description: 'Compressor de ar da linha de usinagem.',
      qrCode: 'CP002',
      status: 'ACTIVE',
      installedAt: isoDate(now, -1200 * DAY),
      createdAt,
      updatedAt,
      version: 1,
    },
    {
      id: EQUIPMENT_IDS.bomba,
      siteId: SITE_IDS.filialCampinas,
      name: 'Bomba BM-003',
      assetNumber: 'PAT-000003',
      serialNumber: 'BM003-2022-1130',
      manufacturer: 'KSB',
      model: 'Meganorm 65',
      description: 'Bomba de recalque do reservatório.',
      qrCode: 'BM003',
      status: 'ACTIVE',
      installedAt: isoDate(now, -600 * DAY),
      createdAt,
      updatedAt,
      version: 1,
    },
    // Descomissionado: não pode entrar em nova inspeção (RN-012), mas continua
    // visível porque já possui histórico (RN-013).
    {
      id: EQUIPMENT_IDS.elevador,
      siteId: SITE_IDS.sedeRio,
      name: 'Elevador EL-004',
      assetNumber: 'PAT-000004',
      serialNumber: 'EL004-2015-0093',
      manufacturer: 'Atlas Schindler',
      model: 'Smart 300',
      description: 'Elevador social — retirado de operação.',
      qrCode: 'EL004',
      status: 'DECOMMISSIONED',
      installedAt: isoDate(now, -3000 * DAY),
      createdAt,
      updatedAt: iso(now, -5 * DAY),
      version: 2,
    },
  ];
}

// ------------------------------------------------------ modelos de inspeção

interface ItemSeed {
  code: string;
  title: string;
  description?: string;
  responseType: ResponseType;
  required: boolean;
  observationRequiredOnFailure?: boolean;
  evidenceRequiredOnFailure?: boolean;
  options?: { value: string; label: string }[];
}

interface SectionSeed {
  title: string;
  description: string;
  items: ItemSeed[];
}

/** "Inspeção de Segurança" — 3 seções, 6 itens, publicada. */
export const SAFETY_SECTIONS: readonly SectionSeed[] = [
  {
    title: 'Verificação Visual',
    description: 'Inspeção visual antes de energizar o equipamento.',
    items: [
      {
        code: 'VIS-01',
        title: 'A proteção do equipamento está íntegra?',
        description: 'Verifique trincas, ausência de parafusos e partes soltas.',
        responseType: 'CONFORMITY',
        required: true,
        observationRequiredOnFailure: true,
        evidenceRequiredOnFailure: true,
      },
      {
        code: 'VIS-02',
        title: 'Identificação do equipamento (placa/etiqueta)',
        responseType: 'TEXT_SHORT',
        required: false,
      },
      {
        code: 'VIS-03',
        title: 'Sinalização de segurança está legível?',
        responseType: 'BOOLEAN',
        required: false,
      },
    ],
  },
  {
    title: 'Medições',
    description: 'Leituras registradas em campo.',
    items: [
      {
        code: 'MED-01',
        title: 'Temperatura de operação (°C)',
        responseType: 'NUMBER',
        required: true,
      },
      {
        code: 'MED-02',
        title: 'Data da última manutenção',
        responseType: 'DATE',
        required: false,
      },
    ],
  },
  {
    title: 'Observações Gerais',
    description: 'Registro livre do técnico.',
    items: [
      {
        code: 'OBS-01',
        title: 'Observações adicionais sobre o equipamento',
        responseType: 'TEXT_LONG',
        required: false,
      },
    ],
  },
];

/** "Checklist Elétrico" — rascunho, ainda sem versão publicada. */
const ELECTRIC_SECTIONS: readonly SectionSeed[] = [
  {
    title: 'Painéis',
    description: 'Verificação dos painéis elétricos.',
    items: [
      {
        code: 'PAI-01',
        title: 'Painel está aterrado corretamente?',
        responseType: 'CONFORMITY',
        required: true,
        observationRequiredOnFailure: true,
      },
      {
        code: 'PAI-02',
        title: 'Classe de proteção do painel',
        responseType: 'SINGLE_CHOICE',
        required: false,
        options: [
          { value: 'IP54', label: 'IP54' },
          { value: 'IP65', label: 'IP65' },
          { value: 'IP66', label: 'IP66' },
        ],
      },
    ],
  },
];

/** Achata as seções em itens, preservando a ordem declarada (RN-017). */
function flattenItems(sections: readonly SectionSeed[]): ItemSeed[] {
  return sections.flatMap((section) => section.items);
}

function buildSections(
  sections: readonly SectionSeed[],
  versionId: Uuid,
  sectionPrefix: string,
  itemPrefix: string,
  createdAt: string,
): TemplateSectionDetail[] {
  return sections.map((section, sectionIndex) => {
    const sectionId = childId(sectionPrefix, 1, sectionIndex + 1);

    const items: TemplateItem[] = section.items.map((item, itemIndex) => ({
      id: childId(itemPrefix, sectionIndex + 1, itemIndex + 1),
      sectionId,
      code: item.code,
      title: item.title,
      description: item.description ?? null,
      responseType: item.responseType,
      required: item.required,
      observationRequiredOnFailure: item.observationRequiredOnFailure ?? false,
      evidenceRequiredOnFailure: item.evidenceRequiredOnFailure ?? false,
      optionsJson: item.options ? { options: item.options } : null,
      displayOrder: itemIndex + 1,
      createdAt,
    }));

    return {
      id: sectionId,
      templateVersionId: versionId,
      title: section.title,
      description: section.description,
      displayOrder: sectionIndex + 1,
      createdAt,
      items,
    };
  });
}

function buildTemplates(now: number): {
  templates: InspectionTemplate[];
  templateVersions: InspectionTemplateVersionDetail[];
  draftSections: Record<Uuid, TemplateSectionDetail[]>;
} {
  const createdAt = iso(now, -180 * DAY);
  const publishedAt = iso(now, -150 * DAY);

  const templates: InspectionTemplate[] = [
    {
      id: TEMPLATE_IDS.seguranca,
      title: 'Inspeção de Segurança',
      description: 'Checklist padrão de segurança para equipamentos industriais.',
      category: 'SEGURANCA',
      status: 'ACTIVE',
      currentVersion: 1,
      createdBy: USER_IDS.supervisor,
      createdAt,
      updatedAt: publishedAt,
      version: 1,
    },
    {
      id: TEMPLATE_IDS.eletrico,
      title: 'Checklist Elétrico',
      description: 'Verificação de painéis e aterramento. Ainda em elaboração.',
      category: 'ELETRICA',
      status: 'DRAFT',
      // Sem versão publicada: não pode ser usado para agendar (RN-024).
      currentVersion: null,
      createdBy: USER_IDS.supervisor,
      createdAt: iso(now, -20 * DAY),
      updatedAt: iso(now, -2 * DAY),
      version: 1,
    },
  ];

  const templateVersions: InspectionTemplateVersionDetail[] = [
    {
      id: TEMPLATE_VERSION_IDS.segurancaV1,
      templateId: TEMPLATE_IDS.seguranca,
      versionNumber: 1,
      titleSnapshot: 'Inspeção de Segurança',
      descriptionSnapshot: 'Checklist padrão de segurança para equipamentos industriais.',
      publishedBy: USER_IDS.supervisor,
      publishedAt,
      activeForNewInspections: true,
      createdAt: publishedAt,
      sections: buildSections(
        SAFETY_SECTIONS,
        TEMPLATE_VERSION_IDS.segurancaV1,
        '5200',
        '5300',
        publishedAt,
      ),
    },
  ];

  // O rascunho não tem versão: suas seções vivem à parte até a publicação.
  const draftSections: Record<Uuid, TemplateSectionDetail[]> = {
    [TEMPLATE_IDS.eletrico]: buildSections(
      ELECTRIC_SECTIONS,
      TEMPLATE_IDS.eletrico,
      '5400',
      '5500',
      iso(now, -20 * DAY),
    ),
  };

  return { templates, templateVersions, draftSections };
}

// ------------------------------------------------------------- inspeções

/** Ordem posicional usada para derivar ids determinísticos de filhos. */
const INSPECTION_ORDER: readonly Uuid[] = [
  INSPECTION_IDS.assigned,
  INSPECTION_IDS.inProgress,
  INSPECTION_IDS.submitted,
  INSPECTION_IDS.underReview,
  INSPECTION_IDS.approved,
  INSPECTION_IDS.rejected,
];

function inspectionIndex(inspectionId: Uuid): number {
  return INSPECTION_ORDER.indexOf(inspectionId) + 1;
}

/** Copia os itens do modelo publicado para a inspeção (RN-021). */
function buildSnapshot(inspectionId: Uuid, createdAt: string): InspectionItemSnapshot[] {
  const position = inspectionIndex(inspectionId);
  const snapshots: InspectionItemSnapshot[] = [];
  let itemOrder = 0;

  SAFETY_SECTIONS.forEach((section, sectionIndex) => {
    section.items.forEach((item) => {
      itemOrder += 1;

      snapshots.push({
        id: childId('6100', position, itemOrder),
        inspectionId,
        sourceTemplateItemId: childId('5300', sectionIndex + 1, section.items.indexOf(item) + 1),
        sectionTitle: section.title,
        sectionDescription: section.description,
        sectionOrder: sectionIndex + 1,
        itemCode: item.code,
        itemTitle: item.title,
        itemDescription: item.description ?? null,
        responseType: item.responseType,
        required: item.required,
        // Os sinalizadores do modelo são copiados para `rulesJson` no
        // agendamento — é onde o aplicativo os procura.
        rulesJson: {
          observationRequiredOnFailure: item.observationRequiredOnFailure ?? false,
          evidenceRequiredOnFailure: item.evidenceRequiredOnFailure ?? false,
        },
        optionsJson: item.options ? { options: item.options } : null,
        itemOrder,
        createdAt,
      });
    });
  });

  return snapshots;
}

function defaultAnswer(responseType: ResponseType, now: number): Partial<InspectionResponse> {
  switch (responseType) {
    case 'CONFORMITY':
      return { conformity: 'CONFORMING' };
    case 'TEXT_SHORT':
      return { valueText: 'Placa legível, sem avarias.' };
    case 'TEXT_LONG':
      return { valueText: 'Equipamento em condições normais de operação.' };
    case 'BOOLEAN':
      return { valueBoolean: true };
    case 'NUMBER':
      return { valueNumber: 72.5 };
    case 'DATE':
      return { valueDate: isoDate(now, -45 * DAY) };
    case 'SINGLE_CHOICE':
      return { valueText: 'IP65' };
    default:
      return {};
  }
}

/** Responde os `count` primeiros itens do snapshot. */
function buildResponses(
  snapshot: readonly InspectionItemSnapshot[],
  count: number,
  now: number,
  answeredOffsetMs: number,
  overrides: Record<number, Partial<InspectionResponse>> = {},
): InspectionResponse[] {
  const position = inspectionIndex(snapshot[0]?.inspectionId ?? '');
  const answeredAtDevice = iso(now, answeredOffsetMs);

  return snapshot.slice(0, count).map((item, index) => ({
    id: childId('6200', position, index + 1),
    inspectionId: item.inspectionId,
    inspectionItemId: item.id,
    ...defaultAnswer(item.responseType, now),
    ...overrides[index + 1],
    answeredBy: USER_IDS.technician,
    answeredAtDevice,
    serverReceivedAt: iso(now, answeredOffsetMs + MINUTE),
    createdAt: answeredAtDevice,
    updatedAt: answeredAtDevice,
    version: 1,
  }));
}

function buildEvidence(
  inspectionId: Uuid,
  index: number,
  responseId: Uuid | null,
  nonConformityId: Uuid | null,
  description: string,
  now: number,
  offsetMs: number,
): Evidence {
  return {
    id: childId('6300', inspectionIndex(inspectionId), index),
    inspectionId,
    responseId,
    nonConformityId,
    type: 'PHOTO',
    storageKey: `evidence/${inspectionId}/${index}.jpg`,
    accessUrl: `https://mock.fieldops.local/evidence/${inspectionId}/${index}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 512_000 + index * 1_024,
    checksum: null,
    description,
    latitude: -23.5505,
    longitude: -46.6333,
    capturedAtDevice: iso(now, offsetMs),
    serverReceivedAt: iso(now, offsetMs + MINUTE),
    uploadedAt: iso(now, offsetMs + MINUTE),
    createdBy: USER_IDS.technician,
    createdAt: iso(now, offsetMs),
  };
}

// ------------------------------------------------------------- montagem

export function createMockDataset(now: number = Date.now()): MockDataset {
  const { templates, templateVersions, draftSections } = buildTemplates(now);

  const base = {
    templateVersionId: TEMPLATE_VERSION_IDS.segurancaV1,
    technicianId: USER_IDS.technician,
    createdBy: USER_IDS.supervisor,
    version: 1,
  };

  const inspections: Inspection[] = [
    {
      ...base,
      id: INSPECTION_IDS.assigned,
      clientId: CLIENT_IDS.alfa,
      siteId: SITE_IDS.plantaSaoPaulo,
      equipmentId: EQUIPMENT_IDS.gerador,
      supervisorId: USER_IDS.supervisor,
      title: 'Inspeção Gerador Agosto',
      instructions: 'Conferir nível de óleo antes de energizar.',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      scheduledFor: iso(now, DAY),
      createdAt: iso(now, -3 * DAY),
      updatedAt: iso(now, -3 * DAY),
    },
    {
      ...base,
      id: INSPECTION_IDS.inProgress,
      clientId: CLIENT_IDS.alfa,
      siteId: SITE_IDS.plantaSaoPaulo,
      equipmentId: EQUIPMENT_IDS.compressor,
      supervisorId: USER_IDS.supervisor,
      title: 'Inspeção Compressor',
      instructions: 'Registrar temperatura após 10 minutos de operação.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      scheduledFor: iso(now, -2 * HOUR),
      startedAtDevice: iso(now, -90 * MINUTE),
      startedAtServer: iso(now, -89 * MINUTE),
      createdAt: iso(now, -5 * DAY),
      updatedAt: iso(now, -90 * MINUTE),
    },
    {
      ...base,
      id: INSPECTION_IDS.submitted,
      clientId: CLIENT_IDS.alfa,
      siteId: SITE_IDS.filialCampinas,
      equipmentId: EQUIPMENT_IDS.bomba,
      supervisorId: USER_IDS.supervisor,
      title: 'Inspeção Bomba Julho',
      priority: 'MEDIUM',
      status: 'SUBMITTED',
      scheduledFor: iso(now, -30 * DAY),
      startedAtDevice: iso(now, -30 * DAY + 2 * HOUR),
      startedAtServer: iso(now, -30 * DAY + 2 * HOUR + MINUTE),
      completedAtDevice: iso(now, -30 * DAY + 4 * HOUR),
      submittedAtServer: iso(now, -30 * DAY + 4 * HOUR + MINUTE),
      createdAt: iso(now, -35 * DAY),
      updatedAt: iso(now, -30 * DAY + 4 * HOUR),
    },
    {
      ...base,
      id: INSPECTION_IDS.underReview,
      clientId: CLIENT_IDS.beta,
      siteId: SITE_IDS.sedeRio,
      equipmentId: EQUIPMENT_IDS.elevador,
      supervisorId: USER_IDS.supervisor,
      title: 'Inspeção Elevador Review',
      priority: 'HIGH',
      status: 'UNDER_REVIEW',
      scheduledFor: iso(now, -20 * DAY),
      startedAtDevice: iso(now, -20 * DAY + 2 * HOUR),
      startedAtServer: iso(now, -20 * DAY + 2 * HOUR + MINUTE),
      completedAtDevice: iso(now, -20 * DAY + 5 * HOUR),
      submittedAtServer: iso(now, -20 * DAY + 5 * HOUR + MINUTE),
      createdAt: iso(now, -25 * DAY),
      updatedAt: iso(now, -18 * DAY),
    },
    {
      ...base,
      id: INSPECTION_IDS.approved,
      clientId: CLIENT_IDS.alfa,
      siteId: SITE_IDS.plantaSaoPaulo,
      equipmentId: EQUIPMENT_IDS.gerador,
      supervisorId: USER_IDS.supervisor,
      title: 'Inspeção Gerador Maio',
      priority: 'LOW',
      status: 'APPROVED',
      scheduledFor: iso(now, -90 * DAY),
      startedAtDevice: iso(now, -90 * DAY + 2 * HOUR),
      startedAtServer: iso(now, -90 * DAY + 2 * HOUR + MINUTE),
      completedAtDevice: iso(now, -90 * DAY + 4 * HOUR),
      submittedAtServer: iso(now, -90 * DAY + 4 * HOUR + MINUTE),
      approvedAt: iso(now, -88 * DAY),
      createdAt: iso(now, -95 * DAY),
      updatedAt: iso(now, -88 * DAY),
      version: 2,
    },
    {
      ...base,
      id: INSPECTION_IDS.rejected,
      clientId: CLIENT_IDS.alfa,
      siteId: SITE_IDS.plantaSaoPaulo,
      equipmentId: EQUIPMENT_IDS.compressor,
      supervisorId: USER_IDS.supervisor,
      title: 'Inspeção Compressor Junho',
      priority: 'HIGH',
      status: 'REJECTED',
      scheduledFor: iso(now, -60 * DAY),
      startedAtDevice: iso(now, -60 * DAY + 2 * HOUR),
      startedAtServer: iso(now, -60 * DAY + 2 * HOUR + MINUTE),
      completedAtDevice: iso(now, -60 * DAY + 3 * HOUR),
      submittedAtServer: iso(now, -60 * DAY + 3 * HOUR + MINUTE),
      createdAt: iso(now, -65 * DAY),
      updatedAt: iso(now, -58 * DAY),
      version: 2,
    },
  ];

  // ---- snapshots do checklist, um por inspeção
  const items: Record<Uuid, InspectionItemSnapshot[]> = {};
  for (const inspection of inspections) {
    items[inspection.id] = buildSnapshot(inspection.id, inspection.createdAt);
  }

  // ---- respostas
  const responses: Record<Uuid, InspectionResponse[]> = {
    [INSPECTION_IDS.assigned]: [],
    // 3 de 6: a primeira é não conforme e origina a NC de severidade alta.
    [INSPECTION_IDS.inProgress]: buildResponses(
      items[INSPECTION_IDS.inProgress],
      3,
      now,
      -80 * MINUTE,
      {
        1: {
          conformity: 'NON_CONFORMING',
          observation: 'Tampa lateral com trinca de aproximadamente 10 cm.',
        },
      },
    ),
    [INSPECTION_IDS.submitted]: buildResponses(
      items[INSPECTION_IDS.submitted],
      6,
      now,
      -30 * DAY + 3 * HOUR,
    ),
    [INSPECTION_IDS.underReview]: buildResponses(
      items[INSPECTION_IDS.underReview],
      6,
      now,
      -20 * DAY + 4 * HOUR,
    ),
    [INSPECTION_IDS.approved]: buildResponses(
      items[INSPECTION_IDS.approved],
      6,
      now,
      -90 * DAY + 3 * HOUR,
    ),
    [INSPECTION_IDS.rejected]: buildResponses(
      items[INSPECTION_IDS.rejected],
      6,
      now,
      -60 * DAY + 2.5 * HOUR,
      {
        1: {
          conformity: 'NON_CONFORMING',
          observation: 'Corrosão na base de fixação.',
        },
      },
    ),
  };

  // ---- não conformidades
  const nonConformities: NonConformity[] = [
    {
      id: NON_CONFORMITY_IDS.high,
      inspectionId: INSPECTION_IDS.inProgress,
      inspectionItemId: items[INSPECTION_IDS.inProgress][0].id,
      responseId: responses[INSPECTION_IDS.inProgress][0].id,
      title: 'Trinca na proteção lateral',
      description: 'Trinca de 10 cm na tampa lateral, com risco de desprendimento.',
      severity: 'HIGH',
      status: 'OPEN',
      createdBy: USER_IDS.technician,
      createdAtDevice: iso(now, -75 * MINUTE),
      serverReceivedAt: iso(now, -74 * MINUTE),
      createdAt: iso(now, -75 * MINUTE),
      updatedAt: iso(now, -75 * MINUTE),
      version: 1,
    },
    {
      id: NON_CONFORMITY_IDS.low,
      inspectionId: INSPECTION_IDS.submitted,
      inspectionItemId: items[INSPECTION_IDS.submitted][1].id,
      responseId: responses[INSPECTION_IDS.submitted][1].id,
      title: 'Etiqueta de identificação desbotada',
      description: 'A etiqueta ainda é legível, mas precisa ser substituída na próxima parada.',
      severity: 'LOW',
      status: 'OPEN',
      createdBy: USER_IDS.technician,
      createdAtDevice: iso(now, -30 * DAY + 3.5 * HOUR),
      serverReceivedAt: iso(now, -30 * DAY + 3.5 * HOUR + MINUTE),
      createdAt: iso(now, -30 * DAY + 3.5 * HOUR),
      updatedAt: iso(now, -30 * DAY + 3.5 * HOUR),
      version: 1,
    },
    {
      id: NON_CONFORMITY_IDS.critical,
      inspectionId: INSPECTION_IDS.rejected,
      inspectionItemId: items[INSPECTION_IDS.rejected][0].id,
      responseId: responses[INSPECTION_IDS.rejected][0].id,
      title: 'Corrosão avançada na base de fixação',
      description:
        'Corrosão comprometendo dois dos quatro pontos de fixação. Equipamento deve ser parado até o reparo.',
      severity: 'CRITICAL',
      status: 'OPEN',
      createdBy: USER_IDS.technician,
      createdAtDevice: iso(now, -60 * DAY + 2.8 * HOUR),
      serverReceivedAt: iso(now, -60 * DAY + 2.8 * HOUR + MINUTE),
      createdAt: iso(now, -60 * DAY + 2.8 * HOUR),
      updatedAt: iso(now, -60 * DAY + 2.8 * HOUR),
      version: 1,
    },
  ];

  // ---- evidências
  const evidence: Record<Uuid, Evidence[]> = {
    [INSPECTION_IDS.assigned]: [],
    // A resposta não conforme exige evidência (RN-039).
    [INSPECTION_IDS.inProgress]: [
      buildEvidence(
        INSPECTION_IDS.inProgress,
        1,
        responses[INSPECTION_IDS.inProgress][0].id,
        NON_CONFORMITY_IDS.high,
        'Trinca na tampa lateral.',
        now,
        -74 * MINUTE,
      ),
    ],
    [INSPECTION_IDS.submitted]: [
      buildEvidence(
        INSPECTION_IDS.submitted,
        1,
        responses[INSPECTION_IDS.submitted][0].id,
        null,
        'Vista geral da bomba.',
        now,
        -30 * DAY + 3 * HOUR,
      ),
      buildEvidence(
        INSPECTION_IDS.submitted,
        2,
        responses[INSPECTION_IDS.submitted][1].id,
        NON_CONFORMITY_IDS.low,
        'Etiqueta de identificação.',
        now,
        -30 * DAY + 3.6 * HOUR,
      ),
    ],
    [INSPECTION_IDS.underReview]: [
      buildEvidence(
        INSPECTION_IDS.underReview,
        1,
        responses[INSPECTION_IDS.underReview][0].id,
        null,
        'Casa de máquinas do elevador.',
        now,
        -20 * DAY + 4 * HOUR,
      ),
    ],
    [INSPECTION_IDS.approved]: [
      buildEvidence(
        INSPECTION_IDS.approved,
        1,
        responses[INSPECTION_IDS.approved][0].id,
        null,
        'Painel do gerador.',
        now,
        -90 * DAY + 3 * HOUR,
      ),
    ],
    // A NC crítica precisa de ao menos uma evidência (RN-055).
    [INSPECTION_IDS.rejected]: [
      buildEvidence(
        INSPECTION_IDS.rejected,
        1,
        responses[INSPECTION_IDS.rejected][0].id,
        NON_CONFORMITY_IDS.critical,
        'Base de fixação corroída.',
        now,
        -60 * DAY + 2.9 * HOUR,
      ),
    ],
  };

  // ---- revisões
  const reviews: MockInspectionReview[] = [
    {
      id: childId('8000', 1, 1),
      inspectionId: INSPECTION_IDS.approved,
      reviewerId: USER_IDS.supervisor,
      decision: 'APPROVED',
      reason: null,
      comments: 'Registro completo e evidências legíveis.',
      reviewedAt: iso(now, -88 * DAY),
      reviewCycle: 1,
      createdAt: iso(now, -88 * DAY),
    },
    {
      id: childId('8000', 2, 1),
      inspectionId: INSPECTION_IDS.rejected,
      reviewerId: USER_IDS.supervisor,
      decision: 'REJECTED',
      reason: 'Fotos insuficientes',
      comments: 'As fotos não permitem avaliar a extensão da corrosão.',
      reviewedAt: iso(now, -58 * DAY),
      reviewCycle: 1,
      createdAt: iso(now, -58 * DAY),
      itemsToCorrect: [
        items[INSPECTION_IDS.rejected][0].id,
        items[INSPECTION_IDS.rejected][3].id,
      ],
    },
  ];

  return {
    users: buildUsers(now),
    clients: buildClients(now),
    sites: buildSites(now),
    equipment: buildEquipment(now),
    templates,
    templateVersions,
    draftSections,
    inspections,
    items,
    responses,
    evidence,
    nonConformities,
    reviews,
  };
}

/** Itens do modelo publicado, em ordem — útil para teste e para o construtor. */
export const SAFETY_ITEM_SEEDS: readonly ItemSeed[] = flattenItems(SAFETY_SECTIONS);
