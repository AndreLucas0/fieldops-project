import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import type { Inspection } from '../../core/models/domain';
import { NotificationService } from '../../core/notifications/notification.service';
import { InspectionsService } from '../../core/services/resources';
import { InspectionCancelDialogComponent } from './inspection-cancel-dialog.component';

const VALID_REASON = 'Equipamento fora de operação para manutenção';

describe('InspectionCancelDialogComponent', () => {
  const dialogRef = { close: vi.fn() };

  beforeEach(() => {
    resetMockStore();
    dialogRef.close.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { inspection: { id: 'inspection-1' } as Inspection } },
      ],
    });
  });

  function render() {
    const fixture = TestBed.createComponent(InspectionCancelDialogComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      root,
      textarea: root.querySelector('textarea')!,
      form: root.querySelector('form')!,
      submitButton: root.querySelector<HTMLButtonElement>('button[type="submit"]')!,
    };
  }

  function type(textarea: HTMLTextAreaElement, value: string): void {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
  }

  it('começa com o botão de cancelar desabilitado', () => {
    const { submitButton } = render();

    expect(submitButton.disabled).toBe(true);
  });

  it('não chama o serviço sem justificativa', () => {
    const { form } = render();
    const cancel = vi.spyOn(TestBed.inject(InspectionsService), 'cancel');

    form.dispatchEvent(new Event('submit'));

    expect(cancel).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('não aceita justificativa curta nem só com espaços', () => {
    const { fixture, textarea, form } = render();
    const cancel = vi.spyOn(TestBed.inject(InspectionsService), 'cancel');

    type(textarea, 'curto');
    form.dispatchEvent(new Event('submit'));
    type(textarea, '            ');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(cancel).not.toHaveBeenCalled();
  });

  it('habilita o botão com uma justificativa válida', () => {
    const { fixture, textarea, submitButton } = render();

    type(textarea, VALID_REASON);
    fixture.detectChanges();

    expect(submitButton.disabled).toBe(false);
  });

  it('envia a justificativa sem espaços nas pontas e fecha com true', () => {
    const { fixture, textarea, form } = render();
    const cancel = vi
      .spyOn(TestBed.inject(InspectionsService), 'cancel')
      .mockReturnValue(of({ id: 'inspection-1', status: 'CANCELED' } as Inspection));

    type(textarea, `  ${VALID_REASON}  `);
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit'));

    expect(cancel).toHaveBeenCalledWith('inspection-1', VALID_REASON);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('mantém o diálogo aberto e avisa quando o cancelamento falha', () => {
    const { fixture, textarea, form } = render();
    const error = vi.spyOn(TestBed.inject(NotificationService), 'error');
    vi.spyOn(TestBed.inject(InspectionsService), 'cancel').mockReturnValue(
      throwError(() => new Error('falha de rede')),
    );

    type(textarea, VALID_REASON);
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit'));

    expect(error).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('fecha com false ao voltar', () => {
    const { root } = render();
    const back = [...root.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Voltar'),
    )!;

    back.click();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
