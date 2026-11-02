import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { EQUIPMENT_IDS, resetMockStore, SITE_IDS } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { ApiError } from '../../core/models/api-error.model';
import { EquipmentService } from '../../core/services/resources';
import { EquipmentFormDialogComponent } from './equipment-form-dialog.component';

describe('EquipmentFormDialogComponent', () => {
  beforeEach(() => {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        { provide: MAT_DIALOG_DATA, useValue: { equipment: null } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
  });

  it('exige local ativo, nome e QR Code antes de criar', async () => {
    const fixture = TestBed.createComponent(EquipmentFormDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Selecione um local ativo');
    expect(text).toContain('Informe o nome do equipamento');
    expect(text).toContain('Informe o código QR único');
  });

  it('envia o vínculo e o QR na criação', async () => {
    const fixture = TestBed.createComponent(EquipmentFormDialogComponent);
    const service = TestBed.inject(EquipmentService);
    const equipment = {
      id: EQUIPMENT_IDS.gerador,
      siteId: SITE_IDS.plantaSaoPaulo,
      name: 'Gerador novo',
      qrCode: 'GERADOR-NOVO-01',
      status: 'ACTIVE' as const,
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    const create = vi.spyOn(service, 'create').mockReturnValue(of(equipment));
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      form: {
        controls: {
          siteId: { setValue(value: string): void };
          name: { setValue(value: string): void };
          qrCode: { setValue(value: string): void };
        };
      };
    };
    component.form.controls.siteId.setValue(SITE_IDS.plantaSaoPaulo);
    component.form.controls.name.setValue('  Gerador novo  ');
    component.form.controls.qrCode.setValue(' GERADOR-NOVO-01 ');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: SITE_IDS.plantaSaoPaulo,
        name: 'Gerador novo',
        qrCode: 'GERADOR-NOVO-01',
      }),
    );
    expect(TestBed.inject(MatDialogRef).close).toHaveBeenCalledWith(true);
  });

  it('exibe o conflito quando o QR já existe (RN-011)', async () => {
    const fixture = TestBed.createComponent(EquipmentFormDialogComponent);
    vi.spyOn(TestBed.inject(EquipmentService), 'create').mockReturnValue(
      throwError(
        () =>
          new ApiError({
            kind: 'CONFLICT',
            status: 409,
            code: 'EQUIPMENT_QR_CODE_EXISTS',
            userMessage: 'Já existe um equipamento com esse código QR.',
          }),
      ),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      form: {
        controls: {
          siteId: { setValue(value: string): void };
          name: { setValue(value: string): void };
          qrCode: { setValue(value: string): void };
        };
      };
    };
    component.form.controls.siteId.setValue(SITE_IDS.plantaSaoPaulo);
    component.form.controls.name.setValue('Duplicado');
    component.form.controls.qrCode.setValue('GD001');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Já existe um equipamento',
    );
  });
});
