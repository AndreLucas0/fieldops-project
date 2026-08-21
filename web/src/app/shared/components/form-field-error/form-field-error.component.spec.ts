import { TestBed } from '@angular/core/testing';

import { ApiError } from '../../../core';
import { FormFieldErrorComponent } from './form-field-error.component';

function validationError(): ApiError {
  return new ApiError({
    kind: 'UNPROCESSABLE',
    status: 422,
    code: 'VALIDATION_FAILED',
    userMessage: 'Dados inválidos.',
    fieldErrors: [
      { field: 'email', message: 'E-mail já cadastrado.' },
      { field: 'phone', message: 'Telefone inválido.' },
    ],
  });
}

describe('FormFieldErrorComponent', () => {
  async function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(FormFieldErrorComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('não renderiza nada sem erro', async () => {
    const { element } = await render({ field: 'email', error: null });

    expect(element.querySelector('.field-error')).toBeNull();
  });

  it('exibe a mensagem do campo correspondente', async () => {
    const { element } = await render({ field: 'email', error: validationError() });

    expect(element.querySelector('.field-error')?.textContent?.trim()).toBe(
      'E-mail já cadastrado.',
    );
  });

  it('ignora erro de outro campo', async () => {
    const { element } = await render({ field: 'name', error: validationError() });

    expect(element.querySelector('.field-error')).toBeNull();
  });

  it('anuncia o erro para leitores de tela', async () => {
    const { element } = await render({ field: 'phone', error: validationError() });

    expect(element.querySelector('.field-error')?.getAttribute('role')).toBe('alert');
  });

  it('usa o texto alternativo quando o servidor não detalha o campo', async () => {
    const error = new ApiError({
      kind: 'BAD_REQUEST',
      status: 400,
      code: 'BAD_REQUEST',
      userMessage: 'Requisição inválida.',
    });

    const { element } = await render({
      field: 'email',
      error,
      fallback: 'Revise este campo.',
    });

    expect(element.querySelector('.field-error')?.textContent?.trim()).toBe('Revise este campo.');
  });

  it('limpa a mensagem quando o erro é resolvido', async () => {
    const { fixture, element } = await render({ field: 'email', error: validationError() });
    expect(element.querySelector('.field-error')).not.toBeNull();

    fixture.componentRef.setInput('error', null);
    await fixture.whenStable();

    expect(element.querySelector('.field-error')).toBeNull();
  });
});
