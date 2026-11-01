import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { AuthStore } from '../../core/auth/auth.store';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { ClientsService, SitesService } from '../../core/services/resources';
import { ConfirmDialogService } from '../../shared/components';
import type { Client, InspectionSite } from '../../core/models/domain';
import { ClientsListComponent } from './clients-list.component';

describe('ClientsListComponent', () => {
  beforeEach(() => {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        { provide: ConfirmDialogService, useValue: { open: () => of({ confirmed: true }) } },
      ],
    });
  });

  it('carrega os clientes e mostra estado e campos principais', async () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Clientes');
    expect(text).toContain('Cliente');
    expect(text).toContain('Situação');
    expect(text).toContain('Ativo');
  });

  it('mostra CNPJ, contato e quantidade de locais do cliente', async () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('CNPJ');
    expect(text).toContain('Contato');
    expect(text).toContain('Locais');
    expect(text).toContain('2 locais');
    expect(text).toContain('1 local');
  });

  it('ignora a resposta atrasada de contagem de locais de uma página anterior', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const sites = TestBed.inject(SitesService);
    const previousPage = new Subject<{
      content: InspectionSite[];
      totalElements: number;
      totalPages: number;
      page: number;
      size: number;
    }>();
    const currentPage = new Subject<{
      content: InspectionSite[];
      totalElements: number;
      totalPages: number;
      page: number;
      size: number;
    }>();
    vi.spyOn(sites, 'listByClient')
      .mockReturnValueOnce(previousPage)
      .mockReturnValueOnce(currentPage);
    const component = fixture.componentInstance as unknown as {
      resolveSiteCounts(clients: Client[]): void;
      siteCounts(): Record<string, number | null>;
    };

    component.resolveSiteCounts([{ id: 'old-client' } as Client]);
    component.resolveSiteCounts([{ id: 'current-client' } as Client]);
    currentPage.next({ content: [], totalElements: 3, totalPages: 3, page: 0, size: 1 });
    currentPage.complete();
    previousPage.next({ content: [], totalElements: 1, totalPages: 1, page: 0, size: 1 });
    previousPage.complete();

    expect(component.siteCounts()).toEqual({ 'current-client': 3 });
  });

  it('envia busca ao serviço e reinicia a página quando o filtro muda', async () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const service = TestBed.inject(ClientsService);
    const list = vi.spyOn(service, 'list');

    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    input.value = 'Acme';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Acme', page: 0 }));
  });

  it('mostra o cadastro apenas para o perfil ADMIN', () => {
    const auth = TestBed.inject(AuthStore);
    auth.setSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
      user: { id: 'admin-1', name: 'Admin', email: 'admin@example.test', role: 'ADMIN' },
    });
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Novo cliente');
  });

  it('permite que SUPERVISOR abra os locais do cliente sem ações de escrita', async () => {
    const auth = TestBed.inject(AuthStore);
    auth.setSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
      user: {
        id: 'supervisor-1',
        name: 'Supervisor',
        email: 'supervisor@example.test',
        role: 'SUPERVISOR',
      },
    });
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      columns: () => readonly {
        field: string;
        actions?: readonly { id: string }[];
        link?: (row: Client) => string | unknown[];
      }[];
    };
    const actions = component.columns().find((column) => column.field === 'actions')?.actions ?? [];
    const siteColumn = component.columns().find((column) => column.field === 'id');
    expect(actions).toEqual([]);
    expect(siteColumn?.link?.({ id: 'client-2001' } as Client)).toEqual([
      '/clients',
      'client-2001',
      'sites',
    ]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Novo cliente');

    const siteLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')].find(
      (link) => /\/clients\/[^/]+\/sites/.test(link.getAttribute('href') ?? ''),
    );
    expect(siteLink).toBeTruthy();
  });

  it('confirma a inativação e envia INACTIVE sem excluir o cliente', async () => {
    const auth = TestBed.inject(AuthStore);
    auth.setSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
      user: { id: 'admin-1', name: 'Admin', email: 'admin@example.test', role: 'ADMIN' },
    });
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const clients = TestBed.inject(ClientsService);
    const setStatus = vi.spyOn(clients, 'setStatus');
    const row: Client = {
      id: 'client-2001',
      name: 'Indústria Alfa',
      status: 'ACTIVE',
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    const component = fixture.componentInstance as unknown as {
      onRowAction: (event: { action: string; row: Client }) => void;
    };

    component.onRowAction({ action: 'deactivate', row });
    await fixture.whenStable();

    expect(setStatus).toHaveBeenCalledWith('client-2001', 'INACTIVE');
  });
});
