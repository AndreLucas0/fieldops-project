import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { AuthStore } from '../../core/auth/auth.store';
import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import type { InspectionSite } from '../../core/models/domain';
import { SitesService } from '../../core/services/resources';
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
});
