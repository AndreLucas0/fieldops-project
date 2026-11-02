import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import type { Equipment } from '../../core/models/domain';
import { EquipmentQrDialogComponent } from './equipment-qr-dialog.component';

describe('EquipmentQrDialogComponent', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fieldops-qr'),
      revokeObjectURL: vi.fn(),
    });
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: { equipment: equipment() } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('gera e apresenta o QR localmente a partir do código do equipamento', () => {
    const fixture = TestBed.createComponent(EquipmentQrDialogComponent);
    fixture.detectChanges();

    const image = (fixture.nativeElement as HTMLElement).querySelector('img');
    expect(image?.getAttribute('src')).toBe('blob:fieldops-qr');
    expect(image?.getAttribute('alt')).toContain('PR-101');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('QR-PR-101');

    fixture.destroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fieldops-qr');
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
