import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AuthStore } from '../../core';
import { InspectionsService } from '../../core/services/resources';
import { InspectionPlanningDialogComponent } from './inspection-planning-dialog.component';

describe('FE-W20 — editar planejamento', () => {
  function setup(status = 'ASSIGNED') {
    const update = vi.fn(() => of({ id: 'i1' }));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            inspection: {
              id: 'i1',
              status,
              title: 'Inspeção',
              priority: 'MEDIUM',
              scheduledFor: '2026-11-05T15:00:00Z',
            },
          },
        },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: InspectionsService, useValue: { update } },
      ],
    });
    TestBed.inject(AuthStore).setSession({
      accessToken: 't',
      refreshToken: 'r',
      expiresAt: Date.now() + 60000,
      user: { id: 'u1', name: 'S', email: 's@test.local', role: 'SUPERVISOR' },
    });
    return {
      component: TestBed.createComponent(InspectionPlanningDialogComponent).componentInstance,
      update,
    };
  }
  it('envia somente os campos aceitos por InspectionUpdateRequest', () => {
    const { component, update } = setup();
    component.form.controls.title.setValue('Atualizada');
    component.submit();
    expect(update).toHaveBeenCalledWith('i1', {
      title: 'Atualizada',
      instructions: null,
      priority: 'MEDIUM',
      scheduledFor: '2026-11-05T15:00:00.000Z',
    });
  });
  it('não permite editar uma inspeção aprovada', () => {
    const { component, update } = setup('APPROVED');
    component.submit();
    expect(update).not.toHaveBeenCalled();
  });
});
