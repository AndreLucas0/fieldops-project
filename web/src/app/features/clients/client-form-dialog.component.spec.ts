import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { ClientsService } from '../../core/services/resources';
import { ClientFormDialogComponent } from './client-form-dialog.component';

describe('ClientFormDialogComponent', () => {
  beforeEach(() => {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        { provide: MAT_DIALOG_DATA, useValue: { client: null } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
  });

  it('exige nome e valida o formato opcional do e-mail', async () => {
    const fixture = TestBed.createComponent(ClientFormDialogComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Informe o nome');

    const email = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="email"]',
    )!;
    email.value = 'email-invalido';
    email.dispatchEvent(new Event('input'));
    email.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('e-mail válido');
  });

  it('envia os campos opcionais vazios sem inventar valores e fecha após salvar', async () => {
    const fixture = TestBed.createComponent(ClientFormDialogComponent);
    const service = TestBed.inject(ClientsService);
    const create = vi.spyOn(service, 'create');
    const client = {
      id: 'client-new',
      name: 'Oficina Central',
      status: 'ACTIVE' as const,
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      version: 1,
    };
    create.mockReturnValue(of(client));
    fixture.detectChanges();

    const name = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[formControlName="name"]',
    )!;
    name.value = '  Oficina Central  ';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith({
      name: 'Oficina Central',
      legalName: undefined,
      document: undefined,
      email: undefined,
      phone: undefined,
    });
    expect(TestBed.inject(MatDialogRef).close).toHaveBeenCalledWith(true);
  });
});
