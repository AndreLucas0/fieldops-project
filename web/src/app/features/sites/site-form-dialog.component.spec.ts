import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { CLIENT_IDS, resetMockStore, SITE_IDS } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { SitesService } from '../../core/services/resources';
import { SiteFormDialogComponent } from './site-form-dialog.component';

describe('SiteFormDialogComponent', () => {
  beforeEach(() => {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        { provide: MAT_DIALOG_DATA, useValue: { site: null } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
  });

  it('exige cliente e nome antes de criar um local', async () => {
    const fixture = TestBed.createComponent(SiteFormDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Selecione o cliente responsável');
    expect(text).toContain('Informe o nome do local');
  });

  it('cria o local com o cliente selecionado e coordenadas opcionais', async () => {
    const fixture = TestBed.createComponent(SiteFormDialogComponent);
    const service = TestBed.inject(SitesService);
    const created = {
      id: SITE_IDS.plantaSaoPaulo,
      clientId: CLIENT_IDS.alfa,
      name: 'Novo galpão',
      status: 'ACTIVE' as const,
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    const create = vi.spyOn(service, 'create').mockReturnValue(of(created));
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      form: {
        controls: {
          clientId: { setValue(value: string): void };
          name: { setValue(value: string): void };
        };
      };
    };
    component.form.controls.clientId.setValue(CLIENT_IDS.alfa);
    component.form.controls.name.setValue('  Novo galpão  ');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: CLIENT_IDS.alfa,
        name: 'Novo galpão',
        latitude: null,
        longitude: null,
      }),
    );
    expect(TestBed.inject(MatDialogRef).close).toHaveBeenCalledWith(true);
  });

  it('não permite mudar o cliente vinculado ao editar o local', async () => {
    const site = {
      id: SITE_IDS.plantaSaoPaulo,
      clientId: CLIENT_IDS.alfa,
      name: 'Planta São Paulo',
      status: 'ACTIVE' as const,
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: { site } });
    const fixture = TestBed.createComponent(SiteFormDialogComponent);
    const update = vi.spyOn(TestBed.inject(SitesService), 'update').mockReturnValue(of(site));
    fixture.detectChanges();
    fixture.componentInstance['form'].controls.name.setValue('Planta atualizada');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();

    expect(update).toHaveBeenCalledWith(
      site.id,
      expect.objectContaining({ name: 'Planta atualizada' }),
    );
    expect(update.mock.calls[0][1]).not.toHaveProperty('clientId');
  });
});
