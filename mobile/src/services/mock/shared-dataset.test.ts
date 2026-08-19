/**
 * Integridade do conjunto fictício compartilhado (`shared/src/mocks`).
 *
 * O conjunto é consumido pelo aplicativo e pela interface administrativa. Um
 * vínculo quebrado aqui vira bug de tela nos dois lados e custa caro para
 * encontrar — por isso as relações e as regras de negócio que o conjunto
 * promete cumprir são verificadas, não confiadas.
 *
 * Os testes rodam no Jest do mobile porque o pacote compartilhado não tem
 * executor próprio; a web consome exatamente os mesmos dados.
 */

import {
  createMockStore,
  dashboardSummary,
  inspectionsByStatus,
  nonConformitiesBySeverity,
  paginate,
  type MockStore,
} from '@fieldops/shared';

/** Instante fixo: o conjunto é relativo a `now` e precisa ser reproduzível. */
const NOW = Date.parse('2026-08-18T12:00:00.000Z');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let db: MockStore;

beforeEach(() => {
  db = createMockStore(NOW);
});

describe('composição do conjunto', () => {
  it('tem a quantidade acordada de cada entidade', () => {
    // 3 perfis da especificação + a conta inativa que demonstra a RN-001.
    expect(db.users).toHaveLength(4);
    expect(db.clients).toHaveLength(2);
    expect(db.sites).toHaveLength(3);
    expect(db.equipment).toHaveLength(4);
    expect(db.templates).toHaveLength(2);
    expect(db.inspections).toHaveLength(6);
    expect(db.nonConformities).toHaveLength(3);
  });

  it('cobre um estado de inspeção por cenário', () => {
    expect(db.inspections.map((inspection) => inspection.status).sort()).toEqual([
      'APPROVED',
      'ASSIGNED',
      'IN_PROGRESS',
      'REJECTED',
      'SUBMITTED',
      'UNDER_REVIEW',
    ]);
  });

  it('cobre as quatro severidades previstas nas não conformidades', () => {
    expect(db.nonConformities.map((nc) => nc.severity).sort()).toEqual([
      'CRITICAL',
      'HIGH',
      'LOW',
    ]);
  });

  it('tem um perfil de cada papel entre as contas ativas', () => {
    const ativos = db.users.filter((user) => user.status === 'ACTIVE');
    expect(ativos.map((user) => user.role).sort()).toEqual(['ADMIN', 'SUPERVISOR', 'TECHNICIAN']);
  });

  it('mantém a conta inativa que o login precisa recusar (RN-001)', () => {
    const inativo = db.users.find((user) => user.status === 'INACTIVE');
    expect(inativo?.email).toBe('inativo@fieldops.local');
  });
});

describe('formato dos dados', () => {
  it('usa UUID válido em todo identificador', () => {
    const ids = [
      ...db.users,
      ...db.clients,
      ...db.sites,
      ...db.equipment,
      ...db.templates,
      ...db.templateVersions,
      ...db.inspections,
      ...db.nonConformities,
      ...db.reviews,
      ...Object.values(db.items).flat(),
      ...Object.values(db.responses).flat(),
      ...Object.values(db.evidence).flat(),
    ].map((entity) => entity.id);

    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(id).toMatch(UUID_PATTERN);
    }
  });

  it('não repete identificador entre registros', () => {
    const ids = [...db.inspections, ...db.equipment, ...db.sites].map((entity) => entity.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usa ISO 8601 em toda data', () => {
    const dates = [
      ...db.inspections.flatMap((inspection) => [
        inspection.scheduledFor,
        inspection.createdAt,
        inspection.updatedAt,
      ]),
      ...db.users.map((user) => user.createdAt),
      ...Object.values(db.responses)
        .flat()
        .map((response) => response.answeredAtDevice),
    ];

    for (const value of dates) {
      expect(Number.isNaN(Date.parse(value))).toBe(false);
      expect(new Date(value).toISOString()).toBe(value);
    }
  });
});

describe('integridade dos relacionamentos', () => {
  it('todo local pertence a um cliente existente (RN-009)', () => {
    const clientIds = new Set(db.clients.map((client) => client.id));
    for (const site of db.sites) {
      expect(clientIds.has(site.clientId)).toBe(true);
    }
  });

  it('todo equipamento pertence a um local existente (RN-010)', () => {
    const siteIds = new Set(db.sites.map((site) => site.id));
    for (const equipment of db.equipment) {
      expect(siteIds.has(equipment.siteId)).toBe(true);
    }
  });

  it('não repete código QR entre equipamentos (RN-011)', () => {
    const codes = db.equipment.map((equipment) => equipment.qrCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('o local da inspeção é do cliente e o equipamento é do local (RN-014)', () => {
    for (const inspection of db.inspections) {
      const site = db.sites.find((candidate) => candidate.id === inspection.siteId);
      expect(site?.clientId).toBe(inspection.clientId);

      if (!inspection.equipmentId) continue;
      const equipment = db.equipment.find((candidate) => candidate.id === inspection.equipmentId);
      expect(equipment?.siteId).toBe(inspection.siteId);
    }
  });

  it('toda inspeção aponta para uma versão publicada de modelo (RN-024)', () => {
    const versionIds = new Set(db.templateVersions.map((version) => version.id));
    for (const inspection of db.inspections) {
      expect(versionIds.has(inspection.templateVersionId)).toBe(true);
    }
  });

  it('o modelo em rascunho não tem versão publicada', () => {
    const draft = db.templates.find((template) => template.status === 'DRAFT');
    expect(draft?.currentVersion).toBeNull();
    expect(
      db.templateVersions.some((version) => version.templateId === draft?.id),
    ).toBe(false);
    // As seções do rascunho existem à parte, para o construtor da web editar.
    expect(db.draftSections[draft!.id]).toHaveLength(1);
  });

  it('toda resposta aponta para um item do snapshot da própria inspeção (RN-035)', () => {
    for (const [inspectionId, responses] of Object.entries(db.responses)) {
      const itemIds = new Set((db.items[inspectionId] ?? []).map((item) => item.id));
      for (const response of responses) {
        expect(itemIds.has(response.inspectionItemId)).toBe(true);
      }
    }
  });

  it('toda evidência pertence a uma inspeção existente (RN-045)', () => {
    const inspectionIds = new Set(db.inspections.map((inspection) => inspection.id));
    for (const [inspectionId, evidences] of Object.entries(db.evidence)) {
      expect(inspectionIds.has(inspectionId)).toBe(true);
      for (const evidence of evidences) {
        expect(evidence.inspectionId).toBe(inspectionId);
      }
    }
  });

  it('toda não conformidade pertence a uma inspeção existente (RN-052)', () => {
    const inspectionIds = new Set(db.inspections.map((inspection) => inspection.id));
    for (const nc of db.nonConformities) {
      expect(inspectionIds.has(nc.inspectionId)).toBe(true);
    }
  });

  it('a não conformidade crítica tem descrição e evidência (RN-055)', () => {
    const critical = db.nonConformities.find((nc) => nc.severity === 'CRITICAL');
    expect(critical?.description.trim().length).toBeGreaterThan(0);

    const linked = Object.values(db.evidence)
      .flat()
      .filter((evidence) => evidence.nonConformityId === critical?.id);
    expect(linked.length).toBeGreaterThan(0);
  });

  it('a reprovação tem motivo e aponta os itens a corrigir (RN-080)', () => {
    const rejection = db.reviews.find((review) => review.decision === 'REJECTED');
    expect(rejection?.reason).toBe('Fotos insuficientes');
    expect(rejection?.itemsToCorrect).toHaveLength(2);

    const itemIds = new Set((db.items[rejection!.inspectionId] ?? []).map((item) => item.id));
    for (const id of rejection!.itemsToCorrect ?? []) {
      expect(itemIds.has(id)).toBe(true);
    }
  });
});

describe('estado de execução das inspeções', () => {
  it('a inspeção atribuída está agendada para o futuro e sem respostas', () => {
    const assigned = db.inspections.find((inspection) => inspection.status === 'ASSIGNED')!;
    expect(Date.parse(assigned.scheduledFor)).toBeGreaterThan(NOW);
    expect(db.responses[assigned.id]).toHaveLength(0);
  });

  it('a inspeção em andamento tem 3 das 6 respostas', () => {
    const inProgress = db.inspections.find((inspection) => inspection.status === 'IN_PROGRESS')!;
    expect(db.items[inProgress.id]).toHaveLength(6);
    expect(db.responses[inProgress.id]).toHaveLength(3);
    expect(inProgress.startedAtDevice).toBeTruthy();
  });

  it('a inspeção enviada está completa e tem duas evidências', () => {
    const submitted = db.inspections.find((inspection) => inspection.status === 'SUBMITTED')!;
    expect(db.responses[submitted.id]).toHaveLength(6);
    expect(db.evidence[submitted.id]).toHaveLength(2);
    expect(submitted.completedAtDevice).toBeTruthy();
  });

  it('a inspeção aprovada tem um ciclo de revisão aprovado', () => {
    const approved = db.inspections.find((inspection) => inspection.status === 'APPROVED')!;
    const review = db.reviews.find((entry) => entry.inspectionId === approved.id);
    expect(review?.decision).toBe('APPROVED');
    expect(review?.reviewCycle).toBe(1);
    expect(approved.approvedAt).toBeTruthy();
  });
});

describe('indicadores derivados', () => {
  it('o resumo do painel bate com as inspeções', () => {
    const summary = dashboardSummary(db, NOW);

    expect(summary.totalInspections).toBe(6);
    expect(summary.inspectionsInProgress).toBe(1);
    expect(summary.inspectionsPendingReview).toBe(1);
    expect(summary.inspectionsApproved).toBe(1);
    expect(summary.inspectionsRejected).toBe(1);
    expect(summary.nonConformitiesOpen).toBe(3);
  });

  it('conta como atrasada só a inspeção vencida ainda em aberto', () => {
    // A em andamento estava marcada para duas horas atrás; as concluídas não
    // contam como atraso, mesmo com data passada.
    expect(dashboardSummary(db, NOW).inspectionsOverdue).toBe(1);
  });

  it('a contagem por estado soma o total', () => {
    const total = inspectionsByStatus(db).reduce((sum, entry) => sum + entry.count, 0);
    expect(total).toBe(db.inspections.length);
  });

  it('a contagem por severidade soma o total de não conformidades', () => {
    const total = nonConformitiesBySeverity(db).reduce((sum, entry) => sum + entry.count, 0);
    expect(total).toBe(db.nonConformities.length);
  });
});

describe('paginação', () => {
  it('divide a lista respeitando o tamanho pedido', () => {
    const page = paginate(db.inspections, { page: 0, size: 4 });

    expect(page.content).toHaveLength(4);
    expect(page.totalElements).toBe(6);
    expect(page.totalPages).toBe(2);
  });

  it('a última página traz o resto', () => {
    expect(paginate(db.inspections, { page: 1, size: 4 }).content).toHaveLength(2);
  });

  it('página além do fim vem vazia, sem erro', () => {
    expect(paginate(db.inspections, { page: 9, size: 4 }).content).toHaveLength(0);
  });

  it('limita o tamanho ao máximo do contrato', () => {
    expect(paginate(db.inspections, { size: 5_000 }).size).toBe(100);
  });

  it('ordena por campo e direção', () => {
    const desc = paginate(db.equipment, { sort: 'name,desc' }).content.map((item) => item.name);
    const asc = paginate(db.equipment, { sort: 'name,asc' }).content.map((item) => item.name);

    expect(desc).toEqual([...asc].reverse());
    expect(asc[0]).toBe('Bomba BM-003');
  });
});

describe('isolamento entre execuções', () => {
  it('recriar o banco descarta as alterações da execução anterior', () => {
    db.inspections.pop();
    expect(db.inspections).toHaveLength(5);

    expect(createMockStore(NOW).inspections).toHaveLength(6);
  });
});
