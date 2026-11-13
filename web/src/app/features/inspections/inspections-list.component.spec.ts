import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { AuthStore } from '../../core/auth/auth.store';
import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import type { Inspection, InspectionStatus, UserRole } from '../../core/models/domain';
import { InspectionsService } from '../../core/services/resources';
import { InspectionCancelDialogComponent } from './inspection-cancel-dialog.component';
import { InspectionsListComponent } from './inspections-list.component';

interface ListInternals {
  columns: () => readonly {
    field: string;
    label: string;
    format?: (value: unknown, row: Inspection) => string;
    actions?: readonly { id: string; visible?: (row: Inspection) => boolean }[];
  }[];
  setStatus(value: InspectionStatus | null): void;
  setTechnician(value: string | null): void;
  setClient(value: string | null): void;
  setFrom(value: string | null): void;
  setTo(value: string | null): void;
  onFilter(filters: readonly { key: string; label: string; value: string }[]): void;
  onPage(page: { page?: number; size?: number }): void;
  onRowAction(event: { action: string; row: Inspection }): void;
  activeFilters: () => readonly { key: string; value: string }[];
}

function signIn(role: UserRole): void {
  TestBed.inject(AuthStore).setSession({
    accessToken: 'token',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 60_000,
    user: { id: `${role}-1`, name: role, email: `${role}@example.test`, role },
  });
}

function inspectionWith(status: InspectionStatus): Inspection {
  return { id: 'inspection-1', status } as Inspection;
}

describe('InspectionsListComponent', () => {
  beforeEach(() => {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
      ],
    });
  });

  async function render(role: UserRole = 'SUPERVISOR') {
    signIn(role);
    const fixture = TestBed.createComponent(InspectionsListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance as unknown as ListInternals,
    };
  }

  it('carrega as inspeções e mostra as colunas principais', async () => {
    const { fixture } = await render();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inspeções');
    expect(text).toContain('Cliente');
    expect(text).toContain('Técnico');
    expect(text).toContain('Agendada para');
    expect(text).toContain('Estado');
  });

  it('identifica na coluna Prazo as inspeções atrasadas', async () => {
    const { component } = await render();
    const format = component.columns().find((c) => c.label === 'Prazo')!.format!;
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 60_000).toISOString();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(format(undefined, { status: 'ASSIGNED', scheduledFor: past } as Inspection)).toContain(
      'Atrasada há 3 dias',
    );
    expect(format(undefined, { status: 'ASSIGNED', scheduledFor: future } as Inspection)).toBe('—');
    expect(format(undefined, { status: 'APPROVED', scheduledFor: past } as Inspection)).toBe('—');
  });

  it('envia o estado ao serviço e volta para a primeira página', async () => {
    const { component } = await render();
    const list = vi.spyOn(TestBed.inject(InspectionsService), 'list');

    component.onPage({ page: 2, size: 20 });
    component.setStatus('ASSIGNED');

    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ASSIGNED', page: 0 }));
  });

  it('envia técnico e cliente ao serviço', async () => {
    const { component } = await render();
    const list = vi.spyOn(TestBed.inject(InspectionsService), 'list');

    component.setTechnician('technician-1');
    component.setClient('client-1');

    expect(list).toHaveBeenLastCalledWith(
      expect.objectContaining({ technicianId: 'technician-1', clientId: 'client-1' }),
    );
  });

  it('converte o período em datas ISO que cobrem o dia inteiro', async () => {
    const { component } = await render();
    const list = vi.spyOn(TestBed.inject(InspectionsService), 'list');

    component.setFrom('2026-11-01');
    component.setTo('2026-11-30');

    const query = list.mock.lastCall?.[0] as { scheduledFrom?: string; scheduledTo?: string };
    expect(new Date(query.scheduledFrom!).getTime()).toBe(
      new Date('2026-11-01T00:00:00').getTime(),
    );
    expect(new Date(query.scheduledTo!).getTime()).toBe(new Date('2026-11-30T23:59:59').getTime());
  });

  it('mostra etiquetas dos filtros ativos e remove o filtro ao fechar a etiqueta', async () => {
    const { component } = await render();
    const list = vi.spyOn(TestBed.inject(InspectionsService), 'list');

    component.setStatus('IN_PROGRESS');
    expect(component.activeFilters().map((filter) => filter.key)).toEqual(['status']);

    component.onFilter([]);

    expect(component.activeFilters()).toEqual([]);
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined, page: 0 }));
  });

  it('oferece revisão e cancelamento para o SUPERVISOR', async () => {
    const { component } = await render('SUPERVISOR');

    const actions = component.columns().find((c) => c.field === 'actions')?.actions;

    expect(actions?.map((action) => action.id)).toEqual(['review', 'cancel']);
  });

  it('não oferece cancelar para quem não pode escrever em inspeções', async () => {
    const { component } = await render('TECHNICIAN');

    const actions = component.columns().find((c) => c.field === 'actions')?.actions;

    expect(actions).toEqual([]);
  });

  it('esconde o cancelamento em inspeções aprovadas, enviadas ou já canceladas', async () => {
    const { component } = await render();
    const actions = component.columns().find((c) => c.field === 'actions')?.actions;
    const cancelAction = actions?.find((action) => action.id === 'cancel');

    expect(cancelAction).toBeDefined();

    const visible = cancelAction!.visible!;

    for (const status of ['APPROVED', 'SUBMITTED', 'CANCELED'] as const) {
      expect(visible(inspectionWith(status))).toBe(false);
    }

    for (const status of ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'REJECTED'] as const) {
      expect(visible(inspectionWith(status))).toBe(true);
    }
  });

  it('abre o diálogo de cancelamento e recarrega a lista quando cancelou', async () => {
    const { component } = await render();
    const open = vi
      .spyOn(TestBed.inject(MatDialog), 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as never);
    const list = vi.spyOn(TestBed.inject(InspectionsService), 'list');
    const row = inspectionWith('IN_PROGRESS');

    component.onRowAction({ action: 'cancel', row });

    expect(open).toHaveBeenCalledWith(
      InspectionCancelDialogComponent,
      expect.objectContaining({ data: { inspection: row } }),
    );
    expect(list).toHaveBeenCalled();
  });

  it('não recarrega a lista quando o diálogo é fechado sem cancelar', async () => {
    const { component } = await render();
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => of(false),
    } as never);
    const list = vi.spyOn(TestBed.inject(InspectionsService), 'list');

    component.onRowAction({ action: 'cancel', row: inspectionWith('ASSIGNED') });

    expect(list).not.toHaveBeenCalled();
  });

  it('ignora a ação de cancelar para quem não pode escrever', async () => {
    const { component } = await render('TECHNICIAN');
    const open = vi.spyOn(TestBed.inject(MatDialog), 'open');

    component.onRowAction({ action: 'cancel', row: inspectionWith('ASSIGNED') });

    expect(open).not.toHaveBeenCalled();
  });
});
