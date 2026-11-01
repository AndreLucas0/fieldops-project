import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';

import { CLIENT_IDS, EQUIPMENT_IDS, resetMockStore, SITE_IDS } from '@fieldops/shared';

import { AuthStore } from '../../core/auth/auth.store';
import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import type { Equipment, InspectionSite, NonConformity, User } from '../../core/models/domain';
import type { Page } from '../../core/models/page.model';
import {
  EquipmentService,
  NonConformitiesService,
  SitesService,
  UsersService,
} from '../../core/services/resources';
import { ConfirmDialogService } from '../../shared/components';
import { CatalogListComponent } from './catalog-list.component';
import { EquipmentHistoryDialogComponent } from '../equipment/equipment-history-dialog.component';
import { EquipmentQrDialogComponent } from '../equipment/equipment-qr-dialog.component';

describe('CatalogListComponent', () => {
  async function setup(
    catalog: string,
    role: 'ADMIN' | 'SUPERVISOR' = 'SUPERVISOR',
    queryParams: Record<string, string> = {},
    extraProviders: unknown[] = [],
    routeParams: Record<string, string> = {},
  ) {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        ...(extraProviders as never[]),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        { provide: ConfirmDialogService, useValue: { open: () => of({ confirmed: true }) } },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ catalog }),
            queryParamMap: of(convertToParamMap(queryParams)),
            paramMap: of(convertToParamMap(routeParams)),
            snapshot: {
              data: { catalog },
              queryParamMap: convertToParamMap(queryParams),
              paramMap: convertToParamMap(routeParams),
            },
          },
        },
      ],
    });
    TestBed.inject(AuthStore).setSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
      user: { id: 'user-1', name: 'Teste', email: 'teste@example.test', role },
    });
    const fixture = TestBed.createComponent(CatalogListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  async function render(catalog: string): Promise<string> {
    const fixture = await setup(catalog);
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('apresenta a lista de usuários com perfil e situação', async () => {
    const fixture = await setup('users');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Usuários');
    expect(text).toContain('Perfil');
    expect(text).toContain('Situação');
    expect(text).toContain('Último acesso');
    expect(text).toContain('admin@fieldops.local');
    expect(text).not.toContain('Criado em');
  });

  it('apresenta locais com endereço, coordenadas, contato e total de equipamentos', async () => {
    const text = await render('sites');
    expect(text).toContain('Locais');
    expect(text).toContain('Cliente');
    expect(text).toContain('Endereço');
    expect(text).toContain('Coordenadas');
    expect(text).toContain('Contato');
    expect(text).toContain('Equipamentos');
    expect(text).toContain('Av. das Indústrias, 1500 — São Paulo/SP');
    expect(text).toContain('-23.55 , -46.63');
    expect(text).toContain('Eduardo Prado');
    expect(text).toContain('+55 11 99777-3030');
    expect(text).toContain('2 itens');
  });

  it('apresenta equipamentos com identificadores e situação', async () => {
    const fixture = await setup('equipment');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Equipamentos');
    expect(text).toContain('Stemac · ST-450');
    expect(text).toContain('TAG');
    expect(text).toContain('Patrimônio');
    expect(text).toContain('Nº de série');
    expect(text).toContain('Fabricante / modelo');
    const component = fixture.componentInstance as unknown as {
      columns(): readonly { field: string; label: string; actions?: readonly { id: string }[] }[];
    };
    const columns = component.columns();
    expect(columns.map((column) => column.label)).toEqual([
      'TAG',
      'Patrimônio',
      'Nº de série',
      'Fabricante / modelo',
      'Local',
      'Situação',
      'Ações',
    ]);
    expect(
      columns.find((column) => column.field === 'actions')?.actions?.map(({ id }) => id),
    ).toEqual(expect.arrayContaining(['view-qr', 'view-history']));
  });

  it('abre os diálogos de QR e histórico para o equipamento selecionado', async () => {
    const fixture = await setup('equipment');
    const dialog = TestBed.inject(MatDialog);
    const open = vi.spyOn(dialog, 'open').mockReturnValue({} as never);
    const component = fixture.componentInstance as unknown as {
      data(): { content: Equipment[] };
      onRowAction(event: { action: string; row: Equipment }): void;
    };
    const equipment = component.data().content[0];

    component.onRowAction({ action: 'view-qr', row: equipment });
    component.onRowAction({ action: 'view-history', row: equipment });

    expect(open).toHaveBeenNthCalledWith(
      1,
      EquipmentQrDialogComponent,
      expect.objectContaining({ data: { equipment } }),
    );
    expect(open).toHaveBeenNthCalledWith(
      2,
      EquipmentHistoryDialogComponent,
      expect.objectContaining({ data: { equipment } }),
    );
  });

  it('carrega a lista contextual pelo endpoint de locais do cliente', async () => {
    const fixture = await setup('sites', 'SUPERVISOR', {}, [], { clientId: CLIENT_IDS.alfa });
    const service = TestBed.inject(SitesService);
    const listByClient = vi.spyOn(service, 'listByClient');
    const component = fixture.componentInstance as unknown as { load(): void };

    component.load();
    await fixture.whenStable();

    expect(listByClient).toHaveBeenCalledWith(CLIENT_IDS.alfa, expect.any(Object));
  });

  it('carrega a lista contextual pelo endpoint de equipamentos do local', async () => {
    const fixture = await setup('equipment', 'SUPERVISOR', {}, [], {
      siteId: SITE_IDS.plantaSaoPaulo,
    });
    const service = TestBed.inject(EquipmentService);
    const listBySite = vi.spyOn(service, 'listBySite');
    const component = fixture.componentInstance as unknown as { load(): void };

    component.load();
    await fixture.whenStable();

    expect(listBySite).toHaveBeenCalledWith(SITE_IDS.plantaSaoPaulo, expect.any(Object));
  });

  it('ignora uma resposta antiga da lista após uma nova busca', async () => {
    const fixture = await setup('users');
    const users = TestBed.inject(UsersService);
    const previousRequest = new Subject<Page<User>>();
    const currentRequest = new Subject<Page<User>>();
    vi.spyOn(users, 'list')
      .mockReturnValueOnce(previousRequest)
      .mockReturnValueOnce(currentRequest);
    const component = fixture.componentInstance as unknown as {
      data(): Page<User>;
      load(): void;
      setName(value: string): void;
    };
    const createPage = (id: string): Page<User> => ({
      content: [{ id } as User],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    component.load();
    component.setName('atual');
    currentRequest.next(createPage('current-user'));
    previousRequest.next(createPage('old-user'));

    expect(component.data().content[0]?.id).toBe('current-user');
  });

  it('filtra não conformidades por criticidade', async () => {
    const text = await render('non-conformities');
    expect(text).toContain('Não conformidades');
    expect(text).toContain('Criticidade');
    expect(text).toContain('Inspeção Compressor');
    expect(text).toContain('Evidências');
    expect(text).toContain('Data');
    const component = fixture.componentInstance as unknown as { inspectionChoices(): unknown[] };
    expect(component.inspectionChoices().length).toBeGreaterThan(0);
  });

  it('carrega as inspeções para o filtro e envia a inspeção escolhida à API', async () => {
    const fixture = await setup('non-conformities');
    const nonConformities = TestBed.inject(NonConformitiesService);
    const listNonConformities = vi.spyOn(nonConformities, 'list');
    const component = fixture.componentInstance as unknown as {
      setInspectionId(value: string): void;
      inspectionChoices(): unknown[];
    };

    expect(component.inspectionChoices().length).toBeGreaterThan(0);
    component.setInspectionId('inspection-1');
    await fixture.whenStable();

    expect(listNonConformities).toHaveBeenCalledWith(
      expect.objectContaining({ inspectionId: 'inspection-1' }),
    );
  });

  it('abre a inspeção relacionada à não conformidade em detalhe somente leitura', async () => {
    const fixture = await setup('non-conformities', 'SUPERVISOR');
    const dialog = TestBed.inject(MatDialog);
    const open = vi
      .spyOn(dialog, 'open')
      .mockReturnValue({ afterClosed: () => of(undefined) } as never);
    const nonConformity: NonConformity = {
      id: 'nc-1',
      inspectionId: 'inspection-1',
      title: 'Cabo de aço',
      description: 'Fios rompidos.',
      severity: 'HIGH',
      status: 'OPEN',
      createdAtDevice: '2026-11-01T10:00:00Z',
      createdAt: '2026-11-01T10:00:01Z',
      updatedAt: '2026-11-01T10:00:01Z',
      version: 1,
    };
    const component = fixture.componentInstance as unknown as {
      onRowAction(event: { action: string; row: NonConformity }): void;
    };

    component.onRowAction({ action: 'view-non-conformity', row: nonConformity });

    expect(open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ data: { nonConformity } }),
    );
  });

  it('só mostra cadastro de local e ações de escrita para ADMIN', async () => {
    const fixture = await setup('sites', 'ADMIN');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Novo local');
    expect(text).toContain('Ações');
  });

  it('mostra cadastro de usuário somente para ADMIN', async () => {
    const admin = await setup('users', 'ADMIN');
    expect((admin.nativeElement as HTMLElement).textContent).toContain('Novo usuário');
  });

  it('não mostra cadastro de usuário para supervisor', async () => {
    const supervisor = await setup('users', 'SUPERVISOR');
    expect((supervisor.nativeElement as HTMLElement).textContent).not.toContain('Novo usuário');
  });

  it('confirma o bloqueio de usuário antes de alterar o estado', async () => {
    const fixture = await setup('users', 'ADMIN');
    const confirmationOpen = vi
      .spyOn(TestBed.inject(ConfirmDialogService), 'open')
      .mockReturnValue(of({ confirmed: true }));
    const service = TestBed.inject(UsersService);
    const setStatus = vi.spyOn(service, 'setStatus').mockReturnValue(
      of({
        id: 'user-x',
        name: 'Usuário',
        email: 'u@example.test',
        role: 'TECHNICIAN',
        status: 'BLOCKED',
        createdAt: '2026-11-01T12:00:00Z',
        updatedAt: '2026-11-01T12:00:00Z',
        version: 2,
      }),
    );
    const component = fixture.componentInstance as unknown as {
      onRowAction(event: {
        action: string;
        row: { id: string; name: string; status: 'ACTIVE' };
      }): void;
    };

    component.onRowAction({
      action: 'block-user',
      row: { id: 'user-x', name: 'Usuário', status: 'ACTIVE' },
    });
    await fixture.whenStable();

    expect(confirmationOpen).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith('user-x', 'BLOCKED');
  });

  it('pede confirmação antes de redefinir senha e exibe mensagem do serviço', async () => {
    const fixture = await setup('users', 'ADMIN');
    const confirmationOpen = vi
      .spyOn(TestBed.inject(ConfirmDialogService), 'open')
      .mockReturnValue(of({ confirmed: true }));
    const service = TestBed.inject(UsersService);
    const resetPassword = vi
      .spyOn(service, 'resetPassword')
      .mockReturnValue(of({ message: 'Instruções enviadas.' }));
    const component = fixture.componentInstance as unknown as {
      onRowAction(event: { action: string; row: { id: string; name: string } }): void;
    };

    component.onRowAction({
      action: 'reset-user-password',
      row: { id: 'user-x', name: 'Usuário' },
    });
    await fixture.whenStable();

    expect(confirmationOpen).toHaveBeenCalled();
    expect(resetPassword).toHaveBeenCalledWith('user-x');
  });

  it('confirma a inativação de local e preserva o registro', async () => {
    const fixture = await setup('sites', 'ADMIN');
    const service = TestBed.inject(SitesService);
    const setStatus = vi.spyOn(service, 'setStatus');
    const site: InspectionSite = {
      id: 'site-1',
      clientId: 'client-1',
      name: 'Planta Central',
      status: 'ACTIVE',
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    setStatus.mockReturnValue(of({ ...site, status: 'INACTIVE' }));
    const component = fixture.componentInstance as unknown as {
      onRowAction: (event: { action: string; row: InspectionSite }) => void;
    };

    component.onRowAction({ action: 'deactivate-site', row: site });
    await fixture.whenStable();

    expect(setStatus).toHaveBeenCalledWith(site.id, 'INACTIVE');
  });

  it('aplica o contexto de cliente vindo da lista de clientes aos locais', async () => {
    const listByClient = vi.fn(() =>
      of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }),
    );
    const fixture = await setup('sites', 'SUPERVISOR', { clientId: 'client-context' }, [
      {
        provide: SitesService,
        useValue: { listByClient, list: vi.fn(), get: vi.fn(), setStatus: vi.fn() },
      },
    ]);

    expect(listByClient).toHaveBeenCalledWith('client-context', expect.any(Object));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Selecionado');
  });

  it('busca equipamento pelo QR e mostra apenas o resultado encontrado', async () => {
    const fixture = await setup('equipment', 'SUPERVISOR');
    const equipment: Equipment = {
      id: EQUIPMENT_IDS.gerador,
      siteId: SITE_IDS.plantaSaoPaulo,
      name: 'Gerador GD-001',
      qrCode: 'GD001',
      status: 'ACTIVE',
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    const service = TestBed.inject(EquipmentService);
    const getByQrCode = vi.spyOn(service, 'getByQrCode').mockReturnValue(of(equipment));
    const component = fixture.componentInstance as unknown as {
      qrCode: { set(value: string): void };
      lookupQr: () => void;
    };
    component.qrCode.set(' GD001 ');
    component.lookupQr();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getByQrCode).toHaveBeenCalledWith('GD001');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('QR Code: GD001');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Gerador GD-001');
  });

  it('confirma a desativação de equipamento e chama o status documentado', async () => {
    const fixture = await setup('equipment', 'SUPERVISOR');
    const service = TestBed.inject(EquipmentService);
    const setStatus = vi.spyOn(service, 'setStatus');
    const equipment: Equipment = {
      id: EQUIPMENT_IDS.gerador,
      siteId: SITE_IDS.plantaSaoPaulo,
      name: 'Gerador GD-001',
      qrCode: 'GD001',
      status: 'ACTIVE',
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    setStatus.mockReturnValue(of({ ...equipment, status: 'INACTIVE' }));
    const component = fixture.componentInstance as unknown as {
      onRowAction: (event: { action: string; row: Equipment }) => void;
    };

    component.onRowAction({ action: 'deactivate-equipment', row: equipment });
    await fixture.whenStable();

    expect(setStatus).toHaveBeenCalledWith(equipment.id, 'INACTIVE');
  });
});
