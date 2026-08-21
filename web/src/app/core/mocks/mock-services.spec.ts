import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { EQUIPMENT_IDS, INSPECTION_IDS, USER_IDS, resetMockStore } from '@fieldops/shared';

import { ApiError } from '../models/api-error.model';
import { provideResources } from '../core.providers';
import {
  ClientsService,
  DashboardService,
  EquipmentService,
  InspectionsService,
  NonConformitiesService,
  SitesService,
  TemplatesService,
  UsersService,
  HttpUsersService,
} from '../services/resources';
import { MOCK_LATENCY_MS, MockUsersService } from './mock-services';

/**
 * O backend fictício da web precisa cumprir o mesmo contrato dos serviços
 * reais: paginar, filtrar, aplicar mutações em memória e recusar o que a API
 * recusaria. Sem isso, a tela funcionaria no mock e quebraria na integração.
 */
describe('serviços fictícios da web', () => {
  beforeEach(() => {
    // Cada teste parte do conjunto semeado; sem isso a mutação de um vaza no
    // seguinte. Latência zero para não depender de temporizador.
    resetMockStore();

    TestBed.configureTestingModule({
      providers: [...provideResources(true), { provide: MOCK_LATENCY_MS, useValue: 0 }],
    });
  });

  describe('seleção de implementação', () => {
    it('usa o backend fictício quando MOCK_API está ligado', () => {
      expect(TestBed.inject(UsersService)).toBeInstanceOf(MockUsersService);
    });

    it('usa a API real quando está desligado', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [...provideResources(false)] });

      expect(TestBed.inject(UsersService)).toBeInstanceOf(HttpUsersService);
    });
  });

  describe('UsersService', () => {
    it('lista as contas semeadas', async () => {
      const page = await firstValueFrom(TestBed.inject(UsersService).list());

      expect(page.totalElements).toBe(4);
      expect(page.content.map((user) => user.role)).toContain('ADMIN');
    });

    it('filtra por perfil', async () => {
      const page = await firstValueFrom(TestBed.inject(UsersService).list({ role: 'TECHNICIAN' }));

      expect(page.content.every((user) => user.role === 'TECHNICIAN')).toBe(true);
      expect(page.totalElements).toBe(2);
    });

    it('filtra por nome sem diferenciar caixa', async () => {
      const page = await firstValueFrom(
        TestBed.inject(UsersService).list({ name: 'administradora' }),
      );

      expect(page.content).toHaveLength(1);
      expect(page.content[0].name).toBe('Ana Administradora');
    });

    it('o filtro de nome casa por trecho, como um campo de busca', async () => {
      // 'ana' aparece em "Ana Administradora" e em "Joana Inativa".
      const page = await firstValueFrom(TestBed.inject(UsersService).list({ name: 'ana' }));

      expect(page.content).toHaveLength(2);
    });

    it('busca por identificador', async () => {
      const user = await firstValueFrom(TestBed.inject(UsersService).get(USER_IDS.supervisor));

      expect(user.name).toBe('Marina Supervisora');
    });

    it('devolve 404 para identificador inexistente', async () => {
      const service = TestBed.inject(UsersService);
      const erro = await firstValueFrom(service.get('nao-existe')).catch((e: ApiError) => e);

      expect(erro).toBeInstanceOf(ApiError);
      expect((erro as ApiError).status).toBe(404);
    });

    it('criar aparece na listagem seguinte', async () => {
      const service = TestBed.inject(UsersService);
      const criado = await firstValueFrom(
        service.create({ name: 'Novo Técnico', email: 'novo@fieldops.local', role: 'TECHNICIAN' }),
      );

      const page = await firstValueFrom(service.list());
      expect(page.totalElements).toBe(5);
      expect(page.content.map((user) => user.id)).toContain(criado.id);
    });

    it('editar altera o registro e avança a versão', async () => {
      const service = TestBed.inject(UsersService);
      const antes = await firstValueFrom(service.get(USER_IDS.technician));

      const depois = await firstValueFrom(service.update(USER_IDS.technician, { name: 'Carlos S.' }));

      expect(depois.name).toBe('Carlos S.');
      expect(depois.version).toBe(antes.version + 1);
      expect((await firstValueFrom(service.get(USER_IDS.technician))).name).toBe('Carlos S.');
    });

    it('inativar muda a situação', async () => {
      const service = TestBed.inject(UsersService);
      const inativado = await firstValueFrom(service.setStatus(USER_IDS.admin, 'INACTIVE'));

      expect(inativado.status).toBe('INACTIVE');
    });
  });

  describe('paginação', () => {
    it('respeita página e tamanho', async () => {
      const page = await firstValueFrom(
        TestBed.inject(InspectionsService).list({ page: 0, size: 2 }),
      );

      expect(page.content).toHaveLength(2);
      expect(page.totalElements).toBe(6);
      expect(page.totalPages).toBe(3);
    });

    it('aceita ordenação em objeto', async () => {
      const page = await firstValueFrom(
        TestBed.inject(EquipmentService).list({ sort: { field: 'name', direction: 'asc' } }),
      );

      expect(page.content[0].name).toBe('Bomba BM-003');
    });
  });

  describe('ClientsService e SitesService', () => {
    it('lista locais de um cliente', async () => {
      const clientes = await firstValueFrom(TestBed.inject(ClientsService).list({ name: 'Alfa' }));
      const locais = await firstValueFrom(
        TestBed.inject(SitesService).listByClient(clientes.content[0].id),
      );

      expect(locais).toHaveLength(2);
      expect(locais.map((site) => site.name)).toEqual(['Planta São Paulo', 'Filial Campinas']);
    });

    it('recusa local sem cliente válido (RN-009)', async () => {
      const erro = await firstValueFrom(
        TestBed.inject(SitesService).create({ name: 'Local solto' }),
      ).catch((e: ApiError) => e);

      expect((erro as ApiError).status).toBe(422);
      expect((erro as ApiError).fieldError('clientId')).toBeTruthy();
    });
  });

  describe('EquipmentService', () => {
    it('encontra por código QR', async () => {
      const equipamento = await firstValueFrom(TestBed.inject(EquipmentService).getByQrCode('CP002'));

      expect(equipamento.name).toBe('Compressor CP-002');
    });

    it('recusa código QR repetido (RN-011)', async () => {
      const erro = await firstValueFrom(
        TestBed.inject(EquipmentService).create({ name: 'Clone', qrCode: 'GD001' }),
      ).catch((e: ApiError) => e);

      expect((erro as ApiError).status).toBe(409);
    });

    it('lista os equipamentos de um local', async () => {
      const service = TestBed.inject(EquipmentService);
      const gerador = await firstValueFrom(service.get(EQUIPMENT_IDS.gerador));
      const doLocal = await firstValueFrom(service.listBySite(gerador.siteId));

      expect(doLocal).toHaveLength(2);
    });
  });

  describe('TemplatesService', () => {
    it('a versão publicada traz seções e itens', async () => {
      const service = TestBed.inject(TemplatesService);
      const modelos = await firstValueFrom(service.list({ status: 'ACTIVE' }));
      const versoes = await firstValueFrom(service.listVersions(modelos.content[0].id));

      expect(versoes).toHaveLength(1);
      expect(versoes[0].sections).toHaveLength(3);
      expect(versoes[0].sections?.flatMap((secao) => secao.items ?? [])).toHaveLength(6);
    });

    it('o rascunho não tem versão publicada, mas tem seções para editar', async () => {
      const service = TestBed.inject(TemplatesService);
      const rascunhos = await firstValueFrom(service.list({ status: 'DRAFT' }));
      const id = rascunhos.content[0].id;

      expect(await firstValueFrom(service.listVersions(id))).toHaveLength(0);
      expect(await firstValueFrom(service.listDraftSections(id))).toHaveLength(1);
    });
  });

  describe('InspectionsService', () => {
    it('filtra por estado', async () => {
      const page = await firstValueFrom(
        TestBed.inject(InspectionsService).list({ status: 'APPROVED' }),
      );

      expect(page.totalElements).toBe(1);
      expect(page.content[0].title).toBe('Inspeção Gerador Maio');
    });

    it('o detalhe traz checklist, respostas, NCs e revisões', async () => {
      const detalhe = await firstValueFrom(
        TestBed.inject(InspectionsService).get(INSPECTION_IDS.inProgress),
      );

      expect(detalhe.items).toHaveLength(6);
      expect(detalhe.responses).toHaveLength(3);
      expect(detalhe.nonConformities).toHaveLength(1);
    });

    it('criar gera o snapshot do checklist (RN-021)', async () => {
      const service = TestBed.inject(InspectionsService);
      const criada = await firstValueFrom(
        service.create({ title: 'Nova inspeção', technicianId: USER_IDS.technician }),
      );

      const detalhe = await firstValueFrom(service.get(criada.id));
      expect(criada.status).toBe('ASSIGNED');
      expect(detalhe.items).toHaveLength(6);
      expect(detalhe.responses).toHaveLength(0);
    });

    it('recusa agendar com equipamento descomissionado (RN-012)', async () => {
      const erro = await firstValueFrom(
        TestBed.inject(InspectionsService).create({ equipmentId: EQUIPMENT_IDS.elevador }),
      ).catch((e: ApiError) => e);

      expect((erro as ApiError).status).toBe(422);
      expect((erro as ApiError).fieldError('equipmentId')).toBeTruthy();
    });

    it('cancelar registra o motivo', async () => {
      const cancelada = await firstValueFrom(
        TestBed.inject(InspectionsService).cancel(INSPECTION_IDS.assigned, 'Cliente adiou'),
      );

      expect(cancelada.status).toBe('CANCELED');
      expect(cancelada.canceledReason).toBe('Cliente adiou');
    });

    it('não cancela inspeção aprovada (RN-030)', async () => {
      const erro = await firstValueFrom(
        TestBed.inject(InspectionsService).cancel(INSPECTION_IDS.approved, 'qualquer'),
      ).catch((e: ApiError) => e);

      expect((erro as ApiError).status).toBe(409);
    });

    it('iniciar revisão exige o estado enviado (RN-089)', async () => {
      const service = TestBed.inject(InspectionsService);

      const emRevisao = await firstValueFrom(service.beginReview(INSPECTION_IDS.submitted));
      expect(emRevisao.status).toBe('UNDER_REVIEW');

      const erro = await firstValueFrom(service.beginReview(INSPECTION_IDS.assigned)).catch(
        (e: ApiError) => e,
      );
      expect((erro as ApiError).status).toBe(409);
    });

    it('aprovar registra a revisão e a data', async () => {
      const service = TestBed.inject(InspectionsService);
      const aprovada = await firstValueFrom(
        service.approve(INSPECTION_IDS.underReview, 'Tudo certo'),
      );

      expect(aprovada.status).toBe('APPROVED');
      expect(aprovada.approvedAt).toBeTruthy();

      const detalhe = await firstValueFrom(service.get(INSPECTION_IDS.underReview));
      expect(detalhe.reviews?.at(-1)?.decision).toBe('APPROVED');
    });

    it('reprovar exige motivo (RN-080)', async () => {
      const erro = await firstValueFrom(
        TestBed.inject(InspectionsService).reject(INSPECTION_IDS.underReview, '   '),
      ).catch((e: ApiError) => e);

      expect((erro as ApiError).status).toBe(422);
    });

    it('reprovar guarda motivo e itens a corrigir', async () => {
      const service = TestBed.inject(InspectionsService);
      const detalheAntes = await firstValueFrom(service.get(INSPECTION_IDS.underReview));
      const itens = (detalheAntes.items ?? []).slice(0, 2).map((item) => item.id);

      const reprovada = await firstValueFrom(
        service.reject(INSPECTION_IDS.underReview, 'Fotos ilegíveis', itens),
      );

      expect(reprovada.status).toBe('REJECTED');

      const depois = await firstValueFrom(service.get(INSPECTION_IDS.underReview));
      const revisao = depois.reviews?.at(-1);
      expect(revisao?.reason).toBe('Fotos ilegíveis');
      expect(revisao?.reviewCycle).toBe(1);
    });

    it('lista as evidências da inspeção', async () => {
      const evidencias = await firstValueFrom(
        TestBed.inject(InspectionsService).listEvidence(INSPECTION_IDS.submitted),
      );

      expect(evidencias).toHaveLength(2);
      expect(evidencias.every((e) => e.inspectionId === INSPECTION_IDS.submitted)).toBe(true);
    });
  });

  describe('NonConformitiesService', () => {
    it('filtra por severidade', async () => {
      const page = await firstValueFrom(
        TestBed.inject(NonConformitiesService).list({ severity: 'CRITICAL' }),
      );

      expect(page.totalElements).toBe(1);
      expect(page.content[0].severity).toBe('CRITICAL');
    });
  });

  describe('DashboardService', () => {
    it('o resumo bate com as inspeções listadas', async () => {
      const resumo = await firstValueFrom(TestBed.inject(DashboardService).summary());
      const inspecoes = await firstValueFrom(TestBed.inject(InspectionsService).list({ size: 100 }));

      expect(resumo.totalInspections).toBe(inspecoes.totalElements);
      expect(resumo.inspectionsApproved).toBe(1);
      expect(resumo.nonConformitiesOpen).toBe(3);
    });

    it('acompanha a mutação: cancelar muda a contagem por estado', async () => {
      await firstValueFrom(
        TestBed.inject(InspectionsService).cancel(INSPECTION_IDS.assigned, 'adiado'),
      );

      const porEstado = await firstValueFrom(TestBed.inject(DashboardService).inspectionsByStatus());
      expect(porEstado.find((entry) => entry.status === 'CANCELED')?.count).toBe(1);
      expect(porEstado.find((entry) => entry.status === 'ASSIGNED')).toBeUndefined();
    });

    it('as severidades somam o total de não conformidades', async () => {
      const porSeveridade = await firstValueFrom(
        TestBed.inject(DashboardService).nonConformitiesBySeverity(),
      );

      expect(porSeveridade.reduce((soma, entry) => soma + entry.count, 0)).toBe(3);
    });
  });

  describe('isolamento entre execuções', () => {
    it('o estado semeado volta ao normal a cada teste', async () => {
      // O teste anterior cancelou uma inspeção; aqui ela está de volta.
      const page = await firstValueFrom(
        TestBed.inject(InspectionsService).list({ status: 'ASSIGNED' }),
      );

      expect(page.totalElements).toBe(1);
    });
  });
});
