import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EmptyStateComponent, StatusBadgeComponent, type BadgeContext } from '../../shared/components';

export interface CategoryDatum {
  /** Valor cru do enum — vira etiqueta pelo catálogo de estados. */
  key: string;
  count: number;
}

/**
 * Barras horizontais de contagem por categoria.
 *
 * **Por que barras e não rosca:** a leitura pedida é comparar quantidades entre
 * categorias de nome longo ("Em andamento", "Aguardando revisão"). Barra
 * horizontal compara comprimento sobre uma linha de base comum e acomoda o
 * rótulo; rosca exige comparar ângulos e empurra os nomes para uma legenda.
 *
 * **Por que todas as barras da mesma cor:** o comprimento já codifica a
 * grandeza e o rótulo já codifica a identidade.
 *
 * **Rótulo:** com `labels`, a categoria é escrita como texto simples (agrupamentos
 * do painel que não existem no catálogo de estados); sem ele, vira a etiqueta do
 * catálogo, a mesma das tabelas do sistema.
 *
 * Todo valor é rotulado na ponta da barra: a dica de mouse acrescenta o
 * percentual, nunca é a única forma de ler o número.
 */
@Component({
  selector: 'app-category-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <section class="chart" [attr.aria-labelledby]="titleId()">
      <header class="chart__head">
        <h2 class="chart__title" [id]="titleId()">{{ title() }}</h2>
        @if (caption()) {
          <p class="chart__caption">{{ caption() }}</p>
        }
      </header>

      @if (rows().length === 0) {
        <div class="chart__empty">
          <app-empty-state
            icon="bar_chart"
            title="Sem dados no período"
            [message]="emptyMessage()"
          />
        </div>
      } @else {
        <!-- Lista de descrição: o leitor de tela anuncia categoria e valor sem
             depender da barra, que é puramente visual. -->
        <dl class="rows">
          @for (row of rows(); track row.key) {
            <div
              class="row"
              [matTooltip]="row.tooltip"
              matTooltipPosition="above"
              tabindex="0"
            >
              <dt class="row__label">
                @if (row.text) {
                  <span class="row__text">{{ row.text }}</span>
                } @else {
                  <app-status-badge [value]="row.key" [context]="context()" />
                }
              </dt>

              <dd class="row__plot">
                <span class="row__track" aria-hidden="true">
                  <span class="row__fill" [style.width.%]="row.percent"></span>
                </span>
                <span class="row__value">{{ row.label }}</span>
              </dd>
            </div>
          }
        </dl>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .chart {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
      border: 1px solid #303842;
      border-radius: 1rem;
      background: #1a2027;

      --fo-viz-fill: var(--mat-sys-primary);
      --fo-viz-track: color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
    }

    .chart__head {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #303842;
    }

    .chart__title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface);
    }

    .chart__caption {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .chart__empty {
      padding: 1rem;
    }

    .rows {
      display: flex;
      flex-direction: column;
      /* Folga entre barras: elas nunca se tocam, então a separação é o próprio
         fundo — sem contorno desenhado em volta da marca. */
      gap: 0.75rem;
      margin: 0;
      padding: 1.25rem;
    }

    .row {
      display: grid;
      grid-template-columns: minmax(6.5rem, 10rem) 1fr;
      align-items: center;
      gap: 0.75rem;
      border-radius: 6px;
      outline-offset: 2px;
    }

    .row:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
    }

    .row__label {
      margin: 0;
      min-width: 0;
    }

    .row__text {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.8125rem;
    }

    .row__plot {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin: 0;
      min-width: 0;
    }

    .row__track {
      flex: 1;
      min-width: 0;
      height: 10px;
      border-radius: 5px;
      background: var(--fo-viz-track);
      overflow: hidden;
    }

    .row__fill {
      display: block;
      height: 100%;
      min-width: 3px;
      background: var(--fo-viz-fill);
      border-radius: 5px;
    }

    .row__value {
      flex: none;
      min-width: 1.5rem;
      color: var(--mat-sys-on-surface);
      font-size: 0.875rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
  `,
})
export class CategoryBarChartComponent {
  readonly title = input.required<string>();
  readonly context = input.required<BadgeContext>();
  readonly data = input.required<readonly CategoryDatum[]>();
  readonly caption = input('');
  readonly emptyMessage = input('Nada foi registrado ainda.');

  /** Ordem de exibição; o que não estiver na lista vai para o fim. */
  readonly order = input<readonly string[]>([]);

  /** Rótulos em texto simples por `key`; o que não constar usa a etiqueta do catálogo. */
  readonly labels = input<Readonly<Record<string, string>>>({});

  protected readonly titleId = computed(
    () => `chart-${this.title().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  );

  private readonly total = computed(() =>
    this.data().reduce((sum, entry) => sum + entry.count, 0),
  );

  protected readonly rows = computed(() => {
    const total = this.total();
    const order = this.order();
    const labels = this.labels();

    const position = (key: string): number => {
      const index = order.indexOf(key);
      return index < 0 ? order.length : index;
    };

    return [...this.data()]
      .sort((left, right) => position(left.key) - position(right.key))
      .map((entry) => {
        const share = total === 0 ? 0 : (entry.count / total) * 100;

        return {
          key: entry.key,
          count: entry.count,
          text: labels[entry.key] ?? null,
          label: entry.count.toLocaleString('pt-BR'),
          // A barra mais longa ocupa a faixa inteira: a comparação é entre
          // categorias, e escalar pelo total deixaria todas curtas demais.
          percent: this.scale(entry.count),
          tooltip: `${entry.count.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} (${share.toFixed(0)}%)`,
        };
      });
  });

  private scale(count: number): number {
    const max = Math.max(...this.data().map((entry) => entry.count), 0);
    return max === 0 ? 0 : (count / max) * 100;
  }
}
