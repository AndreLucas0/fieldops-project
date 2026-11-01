import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { AuthStore } from '../../core/auth/auth.store';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { ClientsService } from '../../core/services/resources';
import { ConfirmDialogService } from '../../shared/components';
import type { Client } from '../../core/models/domain';
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
      columns: () => readonly { field: string; actions?: readonly { id: string }[] }[];
      onRowAction: (event: { action: string; row: Client }) => void;
    };
    const actions = component.columns().find((column) => column.field === 'actions')?.actions ?? [];
    expect(actions.map((action) => action.id)).toEqual(['view-sites']);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Novo cliente');

    const client: Client = {
      id: 'client-2001',
      name: 'Indústria Alfa',
      status: 'ACTIVE',
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onRowAction({ action: 'view-sites', row: client });

    expect(navigate).toHaveBeenCalledWith(['/sites'], { queryParams: { clientId: client.id } });
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
