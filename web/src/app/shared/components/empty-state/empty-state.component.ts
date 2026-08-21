import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Estado vazio: ícone, mensagem e uma ação opcional.
 *
 * Ausência de dados não é erro (`docs/telas-frontend.md` FE-M03) — por isso
 * este componente é neutro, sem cor de alerta, e oferece o caminho para criar
 * o primeiro registro.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="empty">
      <mat-icon class="empty__icon" aria-hidden="true">{{ icon() }}</mat-icon>

      <p class="empty__title">{{ title() }}</p>

      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }

      @if (actionLabel()) {
        <button matButton="filled" type="button" (click)="action.emit()">
          @if (actionIcon()) {
            <mat-icon>{{ actionIcon() }}</mat-icon>
          }
          {{ actionLabel() }}
        </button>
      }

      <!-- Conteúdo extra opcional (links de ajuda, filtros sugeridos). -->
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 3rem 1.5rem;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }

    .empty__icon {
      width: 3rem;
      height: 3rem;
      font-size: 3rem;
      opacity: 0.55;
    }

    .empty__title {
      margin: 0.5rem 0 0;
      color: var(--mat-sys-on-surface);
      font-size: 1rem;
      font-weight: 500;
    }

    .empty__message {
      margin: 0;
      max-width: 32rem;
      font-size: 0.875rem;
    }

    button {
      margin-top: 0.75rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input('Nenhum registro');
  readonly message = input('');

  /** Sem rótulo, nenhum botão é exibido. */
  readonly actionLabel = input<string | null>(null);
  readonly actionIcon = input<string | null>(null);

  readonly action = output<void>();
}
