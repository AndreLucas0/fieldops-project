import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ApiError } from '../../../core';

/**
 * Erro de validação devolvido pelo servidor, abaixo do campo correspondente.
 *
 * O `errorInterceptor` não emite aviso global para `400`/`422` com
 * `fieldErrors` (`contrato-backend-frontend.md` §5.2): esse erro pertence ao
 * formulário, e é este componente que o exibe.
 *
 * ```html
 * <mat-form-field>
 *   <input matInput formControlName="email" />
 * </mat-form-field>
 * <app-form-field-error field="email" [error]="erro()" />
 * ```
 */
@Component({
  selector: 'app-form-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as text) {
      <p class="field-error" role="alert">{{ text }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .field-error {
      margin: 0.25rem 0 0;
      color: var(--mat-sys-error);
      font-size: 0.75rem;
      line-height: 1rem;
    }
  `,
})
export class FormFieldErrorComponent {
  /** Nome do campo como o servidor o identifica em `fieldErrors[].field`. */
  readonly field = input.required<string>();

  /** Erro da última submissão. `null` limpa a mensagem. */
  readonly error = input<ApiError | null>(null);

  /**
   * Mensagem fixa, para o caso de o servidor recusar sem detalhar o campo.
   * Só é usada quando não há `fieldError` correspondente.
   */
  readonly fallback = input<string | null>(null);

  readonly message = computed(
    () => this.error()?.fieldError(this.field()) ?? this.fallback() ?? null,
  );
}
