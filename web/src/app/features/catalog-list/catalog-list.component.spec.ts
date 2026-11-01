import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { EQUIPMENT_IDS, resetMockStore, SITE_IDS } from '@fieldops/shared';

import { AuthStore } from '../../core/auth/auth.store';
import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import type { Equipment, InspectionSite } from '../../core/models/domain';
import { EquipmentService, SitesService, UsersService } from '../../core/services/resources';
import { ConfirmDialogService } from '../../shared/components';
import { CatalogListComponent } from './catalog-list.component';

describe('CatalogListComponent', () => {
  async function setup(
    catalog: string,
    role: 'ADMIN' | 'SUPERVISOR' = 'SUPERVISOR',
    queryParams: Record<string, string> = {},
    extraProviders: unknown[] = [],
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
            snapshot: {
              data: { catalog },
              queryParamMap: convertToParamMap(queryParams),
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
    const text = await render('users');
    expect(text).toContain('Usuários');
    expect(text).toContain('Perfil');
    expect(text).toContain('Situação');
  });

  it('apresenta locais com cliente, cidade e estado', async () => {
    const text = await render('sites');
    expect(text).toContain('Locais');
    expect(text).toContain('Cliente');
    expect(text).toContain('Cidade');
  });

  it('apresenta equipamentos com identificadores e situação', async () => {
    const text = await render('equipment');
    expect(text).toContain('Equipamentos');
    expect(text).toContain('Patrimônio');
    expect(text).toContain('Nº de série');
  });

  it('filtra não conformidades por criticidade', async () => {
    const text = await render('non-conformities');
    expect(text).toContain('Não conformidades');
    expect(text).toContain('Criticidade');
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
    const list = vi.fn(() =>
      of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }),
    );
    const fixture = await setup('sites', 'SUPERVISOR', { clientId: 'client-context' }, [
      { provide: SitesService, useValue: { list, get: vi.fn(), setStatus: vi.fn() } },
    ]);

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'client-context' }));
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
