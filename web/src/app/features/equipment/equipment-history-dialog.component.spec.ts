import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import type { Equipment } from '../../core/models/domain';
import { InspectionsService } from '../../core/services/resources';
import { EquipmentHistoryDialogComponent } from './equipment-history-dialog.component';

describe('EquipmentHistoryDialogComponent', () => {
  it('consulta o histórico do equipamento com paginação e somente leitura', async () => {
    const list = vi.fn(() =>
      of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: { equipment: equipment() } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: InspectionsService, useValue: { list } },
      ],
    });
    const fixture = TestBed.createComponent(EquipmentHistoryDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(list).toHaveBeenCalledWith({ page: 0, size: 20, equipmentId: 'equipment-1' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('PR-101');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nenhuma inspeção');
  });
});

function equipment(): Equipment {
  return {
    id: 'equipment-1',
    siteId: 'site-1',
    name: 'PR-101',
    qrCode: 'QR-PR-101',
    status: 'ACTIVE',
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-01T12:00:00Z',
    version: 1,
  };
}
