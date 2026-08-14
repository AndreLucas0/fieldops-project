import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
  type ConfirmDialogResult,
} from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let closed: ConfirmDialogResult[];

  async function render(data: ConfirmDialogData) {
    closed = [];

    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        {
          provide: MatDialogRef,
          useValue: { close: (result: ConfirmDialogResult) => closed.push(result) },
        },
      ],
    });

    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function buttonLabeled(element: HTMLElement, label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label),
    );
  }

  it('exibe título, mensagem e rótulos personalizados', async () => {
    const { element } = await render({
      title: 'Cancelar inspeção',
      message: 'A inspeção sairá da fila do técnico.',
      confirmLabel: 'Cancelar inspeção',
      cancelLabel: 'Voltar',
      variant: 'danger',
    });

    expect(element.textContent).toContain('Cancelar inspeção');
    expect(element.textContent).toContain('A inspeção sairá da fila do técnico.');
    expect(buttonLabeled(element, 'Voltar')).toBeDefined();
  });

  it('confirma direto quando não há campo obrigatório', async () => {
    const { element } = await render({ title: 'Publicar', message: 'Publicar a versão?' });

    const confirm = buttonLabeled(element, 'Confirmar');
    expect(confirm?.disabled).toBe(false);

    confirm?.click();
    expect(closed[0]).toEqual({ confirmed: true });
  });

  it('devolve confirmed: false ao cancelar', async () => {
    const { element } = await render({ title: 'Publicar', message: 'Publicar a versão?' });

    buttonLabeled(element, 'Cancelar')?.click();

    expect(closed[0]).toEqual({ confirmed: false });
  });

  it('mantém o botão bloqueado enquanto o campo obrigatório está vazio', async () => {
    const { fixture, element } = await render({
      title: 'Reprovar inspeção',
      message: 'Informe o que precisa ser corrigido.',
      confirmLabel: 'Reprovar',
      variant: 'danger',
      requiredTextField: { label: 'Motivo da reprovação' },
    });

    expect(buttonLabeled(element, 'Reprovar')?.disabled).toBe(true);

    // Só espaço em branco não satisfaz: o servidor recusaria igual (RN-080).
    const textarea = element.querySelector('textarea');
    textarea!.value = '   ';
    textarea!.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(buttonLabeled(element, 'Reprovar')?.disabled).toBe(true);
  });

  it('libera a confirmação e devolve o texto sem espaços das pontas', async () => {
    const { fixture, element } = await render({
      title: 'Reprovar inspeção',
      message: 'Informe o que precisa ser corrigido.',
      confirmLabel: 'Reprovar',
      requiredTextField: { label: 'Motivo da reprovação' },
    });

    const textarea = element.querySelector('textarea');
    textarea!.value = '  Foto do lacre ilegível.  ';
    textarea!.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const confirm = buttonLabeled(element, 'Reprovar');
    expect(confirm?.disabled).toBe(false);

    confirm?.click();
    expect(closed[0]).toEqual({ confirmed: true, textValue: 'Foto do lacre ilegível.' });
  });

  it('respeita o mínimo de caracteres', async () => {
    const { fixture, element } = await render({
      title: 'Cancelar',
      message: 'Justifique.',
      requiredTextField: { label: 'Justificativa', minLength: 10 },
    });

    const textarea = element.querySelector('textarea');
    textarea!.value = 'curto';
    textarea!.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(buttonLabeled(element, 'Confirmar')?.disabled).toBe(true);

    textarea!.value = 'justificativa suficiente';
    textarea!.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(buttonLabeled(element, 'Confirmar')?.disabled).toBe(false);
  });

  it('usa campo de linha única quando multiline é falso', async () => {
    const { element } = await render({
      title: 'Confirmar',
      message: 'Digite o código.',
      requiredTextField: { label: 'Código', multiline: false },
    });

    expect(element.querySelector('textarea')).toBeNull();
    expect(element.querySelector('input[matInput]')).not.toBeNull();
  });
});
