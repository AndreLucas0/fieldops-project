/**
 * Banco fictício em memória do modo mock.
 *
 * Existe para que todas as telas funcionem sem backend: os dados nascem aqui,
 * são alterados pelas próprias chamadas do app e somem ao recarregar. Não é
 * persistência local — nada disso é gravado no dispositivo.
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
  InspectionTemplateVersionDetail,
  NonConformity,
  ResponseType,
  UserRole,
  UserStatus,
  Uuid,
} from '@/models';

/** Duração do access token fictício, igual ao `expiresIn` do contrato. */
export const MOCK_TOKEN_TTL_SECONDS = 900;

/**
 * Senhas aceitas no modo mock. A primeira é a dos usuários de demonstração do
 * `db/seed.sql`; a segunda é a que as telas de login já usavam antes desta
 * camada existir, mantida para não quebrar quem já tinha o app aberto.
 */
export const MOCK_PASSWORDS: readonly string[] = ['FieldOps@2026', 'fieldops123'];

export interface MockAccount {
  id: Uuid;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone: string | null;
}

export interface MockDatabase {
  accounts: MockAccount[];
  clients: Client[];
  sites: InspectionSite[];
  equipment: Equipment[];
  templateVersions: InspectionTemplateVersionDetail[];
  inspections: Inspection[];
  /** Snapshot do checklist por inspeção (§10.8.3). */
  items: Record<Uuid, InspectionItemSnapshot[]>;
  responses: Record<Uuid, InspectionResponse[]>;
  evidence: Record<Uuid, Evidence[]>;
  nonConformities: NonConformity[];
  reviews: InspectionReview[];
  /** Token de acesso válido → id do usuário. */
  accessTokens: Map<string, Uuid>;
  refreshTokens: Map<string, Uuid>;
}

let sequence = 0;

/** Identificador com cara de UUID, estável dentro de uma execução. */
export function nextMockId(): Uuid {
  sequence += 1;
  return `00000000-0000-4000-8000-${sequence.toString(16).padStart(12, '0')}`;
}

function isoAt(base: number, offsetMinutes: number): string {
  return new Date(base + offsetMinutes * 60_000).toISOString();
}

interface ItemSeed {
  code: string;
  title: string;
  description?: string;
  responseType: ResponseType;
  required: boolean;
  options?: string[];
}

const SECTION_SEEDS: { title: string; description: string; items: ItemSeed[] }[] = [
  {
    title: 'Condições gerais',
    description: 'Verificações visuais antes de energizar o equipamento.',
    items: [
      {
        code: 'GER-01',
        title: 'Área ao redor do equipamento está livre de obstruções?',
        responseType: 'CONFORMITY',
        required: true,
      },
      {
        code: 'GER-02',
        title: 'Sinalização de segurança está legível?',
        responseType: 'BOOLEAN',
        required: true,
      },
      {
        code: 'GER-03',
        title: 'Nível de ruído aferido (dB)',
        description: 'Medir a um metro da carcaça.',
        responseType: 'NUMBER',
        required: true,
      },
      {
        code: 'GER-04',
        title: 'Estado da pintura e identificação',
        responseType: 'SINGLE_CHOICE',
        required: false,
        options: ['Bom', 'Regular', 'Ruim'],
      },
    ],
  },
  {
    title: 'Operação e registros',
    description: 'Itens conferidos com o equipamento em funcionamento.',
    items: [
      {
        code: 'OPE-01',
        title: 'Código do lacre de inspeção',
        responseType: 'TEXT_SHORT',
        required: true,
      },
      {
        code: 'OPE-02',
        title: 'Data da última manutenção registrada',
        responseType: 'DATE',
        required: true,
      },
      {
        code: 'OPE-03',
        title: 'Observações do técnico',
        description: 'Descreva qualquer comportamento fora do esperado.',
        responseType: 'TEXT_LONG',
        required: false,
      },
    ],
  },
];

/**
 * Alternativas de `SINGLE_CHOICE`.
 *
 * TODO: PEND-03 — o contrato não fecha o formato de `optionsJson`. Formato
 * temporário: `{ options: [{ value, label }] }`, o mesmo que
 * `readChoiceOptions` (em `components/checklist-value.ts`) espera.
 */
function toChoiceOptions(labels: readonly string[]): { value: string; label: string }[] {
  return labels.map((label) => ({ value: label.toUpperCase(), label }));
}

/** Gera o snapshot do checklist de uma inspeção a partir do modelo semente. */
function buildItems(inspectionId: Uuid, createdAt: string): InspectionItemSnapshot[] {
  const snapshots: InspectionItemSnapshot[] = [];

  SECTION_SEEDS.forEach((section, sectionIndex) => {
    section.items.forEach((item, itemIndex) => {
      snapshots.push({
        id: nextMockId(),
        inspectionId,
        sourceTemplateItemId: nextMockId(),
        sectionTitle: section.title,
        sectionDescription: section.description,
        sectionOrder: sectionIndex + 1,
        itemCode: item.code,
        itemTitle: item.title,
        itemDescription: item.description ?? null,
        responseType: item.responseType,
        required: item.required,
        // Os sinalizadores do `TemplateItem` são copiados para `rulesJson` no
        // agendamento — é onde `readChecklistRules` os procura.
        rulesJson:
          item.responseType === 'CONFORMITY'
            ? { observationRequiredOnFailure: true, evidenceRequiredOnFailure: true }
            : null,
        optionsJson: item.options ? { options: toChoiceOptions(item.options) } : null,
        itemOrder: itemIndex + 1,
        createdAt,
      });
    });
  });

  return snapshots;
}

export function createMockDatabase(now: number = Date.now()): MockDatabase {
  sequence = 0;

  const technicianId = '8a50e30d-2a58-4a24-944e-10a9948abf01';
  const supervisorId = 'c1d0f6b2-4e63-4a58-9f0d-2b7f9c8ad311';
  const adminId = 'd3b07384-d9a0-4f1e-9d2c-5a6b7c8d9e01';
  const inactiveId = 'f4c2a9d1-7d4a-4a1e-9d55-3f2b6e0c48aa';

  const accounts: MockAccount[] = [
    {
      id: technicianId,
      name: 'Carlos Souza',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
      phone: '+55 11 98888-1010',
    },
    {
      id: supervisorId,
      name: 'Marina Alves',
      email: 'supervisor@fieldops.local',
      role: 'SUPERVISOR',
      status: 'ACTIVE',
      phone: '+55 11 98888-2020',
    },
    {
      id: adminId,
      name: 'Rita Nogueira',
      email: 'admin@fieldops.local',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: null,
    },
    // RN-001: existe para o login recusar usuário inativo.
    {
      id: inactiveId,
      name: 'Joana Lima',
      email: 'inativo@fieldops.local',
      role: 'TECHNICIAN',
      status: 'INACTIVE',
      phone: null,
    },
  ];

  const clientId = nextMockId();
  const clients: Client[] = [
    {
      id: clientId,
      name: 'Metalúrgica Horizonte',
      legalName: 'Metalúrgica Horizonte Indústria e Comércio Ltda.',
      document: '12.345.678/0001-90',
      email: 'manutencao@horizonte.example',
      phone: '+55 11 4002-8922',
      status: 'ACTIVE',
      createdAt: isoAt(now, -60 * 24 * 200),
      updatedAt: isoAt(now, -60 * 24 * 30),
      version: 1,
    },
  ];

  const siteNorthId = nextMockId();
  const siteSouthId = nextMockId();
  const sites: InspectionSite[] = [
    {
      id: siteNorthId,
      clientId,
      name: 'Unidade Norte',
      description: 'Galpão de usinagem e prensas.',
      addressLine: 'Rod. Anhanguera, km 32 — Galpão 4',
      city: 'Cajamar',
      state: 'SP',
      postalCode: '07750-000',
      latitude: -23.3556,
      longitude: -46.8781,
      contactName: 'Eduardo Prado',
      contactPhone: '+55 11 99777-3030',
      status: 'ACTIVE',
      createdAt: isoAt(now, -60 * 24 * 200),
      updatedAt: isoAt(now, -60 * 24 * 20),
      version: 1,
    },
    {
      id: siteSouthId,
      clientId,
      name: 'Unidade Sul',
      description: 'Centro de distribuição.',
      addressLine: 'Av. das Nações, 1200',
      city: 'Diadema',
      state: 'SP',
      postalCode: '09920-000',
      latitude: -23.6862,
      longitude: -46.6208,
      contactName: 'Sandra Melo',
      contactPhone: '+55 11 99666-4040',
      status: 'ACTIVE',
      createdAt: isoAt(now, -60 * 24 * 180),
      updatedAt: isoAt(now, -60 * 24 * 15),
      version: 1,
    },
  ];

  const compressorId = nextMockId();
  const craneId = nextMockId();
  const generatorId = nextMockId();
  const equipment: Equipment[] = [
    {
      id: compressorId,
      siteId: siteNorthId,
      name: 'Compressor de ar CP-100',
      assetNumber: 'PAT-004512',
      serialNumber: 'CP100-2019-8842',
      manufacturer: 'Atlas',
      model: 'CP-100',
      description: 'Compressor parafuso da linha de prensas.',
      qrCode: 'FIELDOPS-EQ-0001',
      status: 'ACTIVE',
      installedAt: '2019-03-14',
      createdAt: isoAt(now, -60 * 24 * 190),
      updatedAt: isoAt(now, -60 * 24 * 10),
      version: 1,
    },
    {
      id: craneId,
      siteId: siteNorthId,
      name: 'Ponte rolante PR-02',
      assetNumber: 'PAT-004980',
      serialNumber: 'PR02-2021-1177',
      manufacturer: 'Munck',
      model: 'PR-02',
      description: null,
      qrCode: 'FIELDOPS-EQ-0002',
      status: 'ACTIVE',
      installedAt: '2021-07-02',
      createdAt: isoAt(now, -60 * 24 * 150),
      updatedAt: isoAt(now, -60 * 24 * 12),
      version: 1,
    },
    {
      id: generatorId,
      siteId: siteSouthId,
      name: 'Gerador GE-220',
      assetNumber: 'PAT-005120',
      serialNumber: 'GE220-2020-5501',
      manufacturer: 'Stemac',
      model: 'GE-220',
      description: 'Gerador de emergência do CD.',
      qrCode: 'FIELDOPS-EQ-0003',
      status: 'ACTIVE',
      installedAt: '2020-11-20',
      createdAt: isoAt(now, -60 * 24 * 140),
      updatedAt: isoAt(now, -60 * 24 * 8),
      version: 1,
    },
  ];

  const templateId = nextMockId();
  const templateVersionId = nextMockId();
  const templateVersions: InspectionTemplateVersionDetail[] = [
    {
      id: templateVersionId,
      templateId,
      versionNumber: 3,
      titleSnapshot: 'Inspeção preventiva de equipamento industrial',
      descriptionSnapshot: 'Checklist mensal aplicado em equipamentos rotativos.',
      publishedBy: supervisorId,
      publishedAt: isoAt(now, -60 * 24 * 40),
      activeForNewInspections: true,
      createdAt: isoAt(now, -60 * 24 * 40),
      sections: SECTION_SEEDS.map((section, sectionIndex) => ({
        id: nextMockId(),
        templateVersionId,
        title: section.title,
        description: section.description,
        displayOrder: sectionIndex + 1,
        createdAt: isoAt(now, -60 * 24 * 40),
        items: section.items.map((item, itemIndex) => ({
          id: nextMockId(),
          sectionId: templateVersionId,
          code: item.code,
          title: item.title,
          description: item.description ?? null,
          responseType: item.responseType,
          required: item.required,
          observationRequiredOnFailure: item.responseType === 'CONFORMITY',
          evidenceRequiredOnFailure: item.responseType === 'CONFORMITY',
          optionsJson: item.options ? { options: toChoiceOptions(item.options) } : null,
          displayOrder: itemIndex + 1,
          createdAt: isoAt(now, -60 * 24 * 40),
        })),
      })),
    },
  ];

  const inspectionSeeds: {
    title: string;
    equipmentId: Uuid;
    siteId: Uuid;
    status: Inspection['status'];
    priority: Inspection['priority'];
    scheduledOffsetMinutes: number;
  }[] = [
    {
      title: 'Preventiva mensal — Compressor CP-100',
      equipmentId: compressorId,
      siteId: siteNorthId,
      status: 'ASSIGNED',
      priority: 'HIGH',
      scheduledOffsetMinutes: 120,
    },
    {
      title: 'Preventiva mensal — Ponte rolante PR-02',
      equipmentId: craneId,
      siteId: siteNorthId,
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      scheduledOffsetMinutes: -90,
    },
    {
      title: 'Preventiva trimestral — Gerador GE-220',
      equipmentId: generatorId,
      siteId: siteSouthId,
      status: 'ASSIGNED',
      priority: 'MEDIUM',
      scheduledOffsetMinutes: 60 * 26,
    },
    {
      title: 'Preventiva mensal — Compressor CP-100 (julho)',
      equipmentId: compressorId,
      siteId: siteNorthId,
      status: 'SUBMITTED',
      priority: 'MEDIUM',
      scheduledOffsetMinutes: -60 * 24 * 3,
    },
    {
      title: 'Preventiva mensal — Gerador GE-220 (junho)',
      equipmentId: generatorId,
      siteId: siteSouthId,
      status: 'REJECTED',
      priority: 'LOW',
      scheduledOffsetMinutes: -60 * 24 * 12,
    },
    {
      title: 'Preventiva mensal — Ponte rolante PR-02 (junho)',
      equipmentId: craneId,
      siteId: siteNorthId,
      status: 'APPROVED',
      priority: 'MEDIUM',
      scheduledOffsetMinutes: -60 * 24 * 20,
    },
  ];

  const inspections: Inspection[] = [];
  const items: Record<Uuid, InspectionItemSnapshot[]> = {};
  const responses: Record<Uuid, InspectionResponse[]> = {};
  const evidence: Record<Uuid, Evidence[]> = {};
  const nonConformities: NonConformity[] = [];
  const reviews: InspectionReview[] = [];

  for (const seed of inspectionSeeds) {
    const id = nextMockId();
    const createdAt = isoAt(now, seed.scheduledOffsetMinutes - 60 * 24);
    const started = seed.status !== 'ASSIGNED' && seed.status !== 'DRAFT';
    const finished = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(seed.status);

    inspections.push({
      id,
      templateVersionId,
      clientId,
      siteId: seed.siteId,
      equipmentId: seed.equipmentId,
      technicianId,
      supervisorId,
      createdBy: supervisorId,
      title: seed.title,
      instructions: 'Registrar foto de qualquer item não conforme antes de enviar.',
      priority: seed.priority,
      status: seed.status,
      scheduledFor: isoAt(now, seed.scheduledOffsetMinutes),
      startedAtDevice: started ? isoAt(now, seed.scheduledOffsetMinutes + 5) : null,
      startedAtServer: started ? isoAt(now, seed.scheduledOffsetMinutes + 6) : null,
      completedAtDevice: finished ? isoAt(now, seed.scheduledOffsetMinutes + 75) : null,
      submittedAtServer: finished ? isoAt(now, seed.scheduledOffsetMinutes + 76) : null,
      approvedAt: seed.status === 'APPROVED' ? isoAt(now, seed.scheduledOffsetMinutes + 600) : null,
      canceledAt: null,
      canceledBy: null,
      canceledReason: null,
      createdAt,
      updatedAt: isoAt(now, seed.scheduledOffsetMinutes + 80),
      version: 1,
    });

    items[id] = buildItems(id, createdAt);
    responses[id] = [];
    evidence[id] = [];
  }

  // A inspeção em andamento já tem parte do checklist preenchido, para a tela
  // de execução abrir com conteúdo em vez de uma lista vazia.
  const inProgress = inspections.find((inspection) => inspection.status === 'IN_PROGRESS');
  if (inProgress) {
    const snapshot = items[inProgress.id] ?? [];
    const answered = snapshot.slice(0, 3);
    const answeredAt = isoAt(now, -45);

    responses[inProgress.id] = answered.map((item, index) => ({
      id: nextMockId(),
      inspectionId: inProgress.id,
      inspectionItemId: item.id,
      valueText: item.responseType === 'TEXT_SHORT' ? 'LC-99231' : null,
      valueNumber: item.responseType === 'NUMBER' ? 82.4 : null,
      valueBoolean: item.responseType === 'BOOLEAN' ? true : null,
      valueDate: null,
      valueJson: null,
      observation: index === 0 ? 'Paletes encostados na lateral do painel.' : null,
      conformity:
        item.responseType === 'CONFORMITY'
          ? index === 0
            ? 'NON_CONFORMING'
            : 'CONFORMING'
          : 'NOT_APPLICABLE',
      answeredBy: technicianId,
      answeredAtDevice: answeredAt,
      serverReceivedAt: answeredAt,
      createdAt: answeredAt,
      updatedAt: answeredAt,
      version: 1,
    }));

    const firstItem = answered[0];
    const firstResponse = responses[inProgress.id]?.[0];
    if (firstItem && firstResponse) {
      nonConformities.push({
        id: nextMockId(),
        inspectionId: inProgress.id,
        inspectionItemId: firstItem.id,
        responseId: firstResponse.id,
        title: 'Obstrução na área de circulação',
        description:
          'Paletes armazenados a menos de 50 cm do painel elétrico, impedindo acesso em emergência.',
        severity: 'HIGH',
        status: 'OPEN',
        createdBy: technicianId,
        createdAtDevice: answeredAt,
        serverReceivedAt: answeredAt,
        createdAt: answeredAt,
        updatedAt: answeredAt,
        version: 1,
      });
    }
  }

  // Revisões das inspeções já fechadas, para a tela de histórico ter o motivo.
  const rejected = inspections.find((inspection) => inspection.status === 'REJECTED');
  if (rejected) {
    reviews.push({
      id: nextMockId(),
      inspectionId: rejected.id,
      reviewerId: supervisorId,
      decision: 'REJECTED',
      reason: 'Foto do item OPE-01 ilegível. Refazer o registro do lacre.',
      comments: null,
      reviewedAt: isoAt(now, -60 * 24 * 11),
      reviewCycle: 1,
      createdAt: isoAt(now, -60 * 24 * 11),
    });
  }

  const approved = inspections.find((inspection) => inspection.status === 'APPROVED');
  if (approved) {
    reviews.push({
      id: nextMockId(),
      inspectionId: approved.id,
      reviewerId: supervisorId,
      decision: 'APPROVED',
      reason: null,
      comments: 'Checklist completo e evidências legíveis.',
      reviewedAt: isoAt(now, -60 * 24 * 19),
      reviewCycle: 1,
      createdAt: isoAt(now, -60 * 24 * 19),
    });
  }

  return {
    accounts,
    clients,
    sites,
    equipment,
    templateVersions,
    inspections,
    items,
    responses,
    evidence,
    nonConformities,
    reviews,
    accessTokens: new Map<string, Uuid>(),
    refreshTokens: new Map<string, Uuid>(),
  };
}

let database: MockDatabase = createMockDatabase();

export function getMockDatabase(): MockDatabase {
  return database;
}

/** Recria os dados fictícios — usado entre casos de teste. */
export function resetMockDatabase(now?: number): MockDatabase {
  database = createMockDatabase(now);
  return database;
}
