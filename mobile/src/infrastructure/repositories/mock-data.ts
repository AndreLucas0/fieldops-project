import type { Inspection, Template } from '@/domain/inspection';

/**
 * Dados de demonstração usados enquanto a API Spring Boot não está de pé.
 *
 * O protótipo lia isso do Supabase; aqui os mesmos dados vivem na memória,
 * atrás do repositório, para que as telas já tenham conteúdo real para
 * renderizar. Nenhuma tela importa este arquivo diretamente.
 */

const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const seedTemplates: Template[] = [
  {
    id: '8f14e45f-ceea-4d1b-9a1e-1c9b0f2a1101',
    title: 'Inspeção de extintores',
    category: 'Segurança',
    description: 'Verificação periódica de extintores de incêndio conforme NR-23.',
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-5 * DAY),
    items: [
      {
        id: 'a1000000-0000-4000-8000-000000000001',
        title: 'Número do patrimônio',
        description: 'Registre o código gravado na etiqueta do equipamento.',
        responseType: 'TEXT_SHORT',
        required: true,
        displayOrder: 1,
      },
      {
        id: 'a1000000-0000-4000-8000-000000000002',
        title: 'O lacre está intacto?',
        responseType: 'CONFORMITY',
        required: true,
        observationRequiredOnFailure: true,
        evidenceRequiredOnFailure: true,
        displayOrder: 2,
      },
      {
        id: 'a1000000-0000-4000-8000-000000000003',
        title: 'O manômetro está na faixa verde?',
        responseType: 'CONFORMITY',
        required: true,
        observationRequiredOnFailure: true,
        displayOrder: 3,
      },
      {
        id: 'a1000000-0000-4000-8000-000000000004',
        title: 'Data de validade indicada no selo',
        responseType: 'DATE',
        required: true,
        displayOrder: 4,
      },
      {
        id: 'a1000000-0000-4000-8000-000000000005',
        title: 'Existe sinalização visível no piso?',
        responseType: 'BOOLEAN',
        required: false,
        displayOrder: 5,
      },
    ],
  },
  {
    id: '8f14e45f-ceea-4d1b-9a1e-1c9b0f2a1102',
    title: 'Inspeção de empilhadeira',
    category: 'Manutenção',
    description: 'Checagem diária antes da liberação do equipamento para operação.',
    createdAt: iso(-60 * DAY),
    updatedAt: iso(-12 * DAY),
    items: [
      {
        id: 'a2000000-0000-4000-8000-000000000001',
        title: 'Horímetro',
        description: 'Valor em horas exibido no painel.',
        responseType: 'NUMBER',
        required: true,
        displayOrder: 1,
      },
      {
        id: 'a2000000-0000-4000-8000-000000000002',
        title: 'Nível de carga da bateria',
        responseType: 'SINGLE_CHOICE',
        required: true,
        options: ['Alta', 'Média', 'Baixa'],
        displayOrder: 2,
      },
      {
        id: 'a2000000-0000-4000-8000-000000000003',
        title: 'Os cabos estão corretamente isolados?',
        responseType: 'CONFORMITY',
        required: true,
        observationRequiredOnFailure: true,
        evidenceRequiredOnFailure: true,
        displayOrder: 3,
      },
      {
        id: 'a2000000-0000-4000-8000-000000000004',
        title: 'A buzina está funcionando?',
        responseType: 'CONFORMITY',
        required: true,
        displayOrder: 4,
      },
      {
        id: 'a2000000-0000-4000-8000-000000000005',
        title: 'Observações gerais do turno',
        responseType: 'TEXT_LONG',
        required: false,
        displayOrder: 5,
      },
    ],
  },
  {
    id: '8f14e45f-ceea-4d1b-9a1e-1c9b0f2a1103',
    title: 'Inspeção de gerador diesel',
    category: 'Manutenção',
    description: 'Rotina mensal de verificação do grupo gerador.',
    createdAt: iso(-15 * DAY),
    updatedAt: iso(-2 * DAY),
    items: [
      {
        id: 'a3000000-0000-4000-8000-000000000001',
        title: 'O nível de óleo está adequado?',
        responseType: 'CONFORMITY',
        required: true,
        observationRequiredOnFailure: true,
        displayOrder: 1,
      },
      {
        id: 'a3000000-0000-4000-8000-000000000002',
        title: 'Existem vazamentos?',
        responseType: 'CONFORMITY',
        required: true,
        observationRequiredOnFailure: true,
        evidenceRequiredOnFailure: true,
        displayOrder: 2,
      },
      {
        id: 'a3000000-0000-4000-8000-000000000003',
        title: 'A bateria está em boas condições?',
        responseType: 'CONFORMITY',
        required: true,
        evidenceRequiredOnFailure: true,
        displayOrder: 3,
      },
      {
        id: 'a3000000-0000-4000-8000-000000000004',
        title: 'O gerador iniciou corretamente?',
        responseType: 'BOOLEAN',
        required: true,
        displayOrder: 4,
      },
    ],
  },
];

const extintores = seedTemplates[0];
const empilhadeira = seedTemplates[1];

export const seedInspections: Inspection[] = [
  {
    id: 'c0ffee00-0000-4000-8000-000000000001',
    templateId: empilhadeira.id,
    templateTitle: empilhadeira.title,
    itemsSnapshot: empilhadeira.items,
    equipment: 'Empilhadeira 01',
    site: 'Fábrica Sorocaba — Galpão B',
    technician: 'Carlos Técnico',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    syncStatus: 'PENDING',
    scheduledFor: iso(2 * HOUR),
    startedAtDevice: iso(-1 * HOUR),
    completedAtDevice: null,
    createdAt: iso(-1 * DAY),
    updatedAt: iso(-1 * HOUR),
    answers: [
      {
        itemId: 'a2000000-0000-4000-8000-000000000001',
        valueNumber: 1842,
        answeredAtDevice: iso(-1 * HOUR),
      },
      {
        itemId: 'a2000000-0000-4000-8000-000000000002',
        valueText: 'Média',
        answeredAtDevice: iso(-1 * HOUR),
      },
    ],
  },
  {
    id: 'c0ffee00-0000-4000-8000-000000000002',
    templateId: extintores.id,
    templateTitle: extintores.title,
    itemsSnapshot: extintores.items,
    equipment: 'Extintor 15',
    site: 'Fábrica Sorocaba — Portaria',
    technician: 'Carlos Técnico',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    syncStatus: 'SYNCED',
    scheduledFor: iso(6 * HOUR),
    startedAtDevice: null,
    completedAtDevice: null,
    createdAt: iso(-2 * DAY),
    updatedAt: iso(-2 * DAY),
    answers: [],
  },
  {
    id: 'c0ffee00-0000-4000-8000-000000000003',
    templateId: extintores.id,
    templateTitle: extintores.title,
    itemsSnapshot: extintores.items,
    equipment: 'Extintor 07',
    site: 'Fábrica Itu — Almoxarifado',
    technician: 'Carlos Técnico',
    priority: 'MEDIUM',
    status: 'SUBMITTED',
    syncStatus: 'SYNCED',
    scheduledFor: iso(-3 * DAY),
    startedAtDevice: iso(-3 * DAY),
    completedAtDevice: iso(-3 * DAY + 40 * 60 * 1000),
    createdAt: iso(-4 * DAY),
    updatedAt: iso(-3 * DAY),
    answers: [
      { itemId: 'a1000000-0000-4000-8000-000000000001', valueText: 'PAT-88213' },
      { itemId: 'a1000000-0000-4000-8000-000000000002', conformity: 'CONFORMING' },
      {
        itemId: 'a1000000-0000-4000-8000-000000000003',
        conformity: 'NON_CONFORMING',
        observation: 'Manômetro fora da faixa operacional, pressão abaixo do mínimo.',
      },
      { itemId: 'a1000000-0000-4000-8000-000000000004', valueDate: '2027-03-01' },
      { itemId: 'a1000000-0000-4000-8000-000000000005', valueBoolean: true },
    ],
  },
  {
    id: 'c0ffee00-0000-4000-8000-000000000004',
    templateId: empilhadeira.id,
    templateTitle: empilhadeira.title,
    itemsSnapshot: empilhadeira.items,
    equipment: 'Empilhadeira 04',
    site: 'Fábrica Campinas — Expedição',
    technician: 'Carlos Técnico',
    priority: 'LOW',
    status: 'APPROVED',
    syncStatus: 'SYNCED',
    scheduledFor: iso(-8 * DAY),
    startedAtDevice: iso(-8 * DAY),
    completedAtDevice: iso(-8 * DAY + 25 * 60 * 1000),
    createdAt: iso(-9 * DAY),
    updatedAt: iso(-7 * DAY),
    answers: [
      { itemId: 'a2000000-0000-4000-8000-000000000001', valueNumber: 2301 },
      { itemId: 'a2000000-0000-4000-8000-000000000002', valueText: 'Alta' },
      { itemId: 'a2000000-0000-4000-8000-000000000003', conformity: 'CONFORMING' },
      { itemId: 'a2000000-0000-4000-8000-000000000004', conformity: 'CONFORMING' },
      { itemId: 'a2000000-0000-4000-8000-000000000005', valueText: 'Sem intercorrências.' },
    ],
  },
];
