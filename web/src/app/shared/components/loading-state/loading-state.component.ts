import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Formato do esqueleto exibido durante o carregamento.
 *
 * - `table`: linhas com colunas, para dentro de uma tabela
 * - `list`: cartões empilhados
 * - `form`: pares rótulo/campo
 * - `card`: bloco único, para painéis e detalhes
 */
export type LoadingVariant = 'table' | 'list' | 'form' | 'card';

/**
 * Esqueleto de carregamento.
 *
 * Ocupa aproximadamente o espaço do conteúdo real para a página não "pular"
 * quando os dados chegam.
 */
@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    '[attr.aria-label]': 'label()',
  },
  template: `
    @switch (variant()) {
      @case ('table') {
        <div class="skeleton-table">
          @for (row of rowRange(); track row) {
            <div class="skeleton-row">
              @for (column of columnRange(); track column) {
                <span class="bar" [style.width.%]="columnWidth(column)"></span>
              }
            </div>
          }
        </div>
      }

      @case ('form') {
        <div class="skeleton-form">
          @for (row of rowRange(); track row) {
            <div class="skeleton-field">
              <span class="bar bar--label"></span>
              <span class="bar bar--control"></span>
            </div>
          }
        </div>
      }

      @case ('card') {
        <div class="skeleton-card">
          <span class="bar bar--title"></span>
          <span class="bar"></span>
          <span class="bar" style="width: 70%"></span>
        </div>
      }

      @default {
        <div class="skeleton-list">
          @for (row of rowRange(); track row) {
            <div class="skeleton-card">
              <span class="bar bar--title"></span>
              <span class="bar" style="width: 60%"></span>
            </div>
          }
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .bar {
      display: block;
      height: 0.75rem;
      border-radius: 0.25rem;
      background: linear-gradient(
        90deg,
        var(--mat-sys-surface-container) 25%,
        var(--mat-sys-surface-container-high) 37%,
        var(--mat-sys-surface-container) 63%
      );
      background-size: 400% 100%;
      animation: fo-skeleton 1.4s ease infinite;
    }

    .bar--title {
      height: 1rem;
      width: 40%;
    }

    .bar--label {
      height: 0.625rem;
      width: 30%;
    }

    .bar--control {
      height: 2.5rem;
      border-radius: 0.25rem;
    }

    .skeleton-row {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .skeleton-row .bar {
      flex: 0 0 auto;
    }

    .skeleton-list,
    .skeleton-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .skeleton-card {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.5rem;
    }

    @keyframes fo-skeleton {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }

    /* Movimento contínuo incomoda quem pediu menos animação (WCAG 2.3.3). */
    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
      }
    }
  `,
})
export class LoadingStateComponent {
  readonly variant = input<LoadingVariant>('list');

  /** Linhas do esqueleto: linhas da tabela, campos do formulário ou cartões. */
  readonly rows = input(5);

  /** Só usado em `table`. */
  readonly columns = input(4);

  readonly label = input('Carregando…');

  protected readonly rowRange = computed(() => range(Math.max(1, this.rows())));
  protected readonly columnRange = computed(() => range(Math.max(1, this.columns())));

  /**
   * Larguras irregulares e estáveis por posição: barras todas iguais parecem
   * um componente quebrado, e larguras sorteadas piscariam a cada render.
   */
  protected columnWidth(index: number): number {
    const widths = [26, 18, 14, 20, 12, 16];
    return widths[index % widths.length] ?? 16;
  }
}

function range(size: number): number[] {
  return Array.from({ length: size }, (_, index) => index);
}
