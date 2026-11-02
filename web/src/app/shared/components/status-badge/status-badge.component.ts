import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { describeStatus, type BadgeContext } from './status-catalog';

/**
 * Etiqueta de estado — traduz um valor de enum da API para rótulo em
 * português e cor, conforme `status-catalog.ts`.
 *
 * ```html
 * <app-status-badge [value]="inspection.status" context="inspection" />
 * ```
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="classes()">{{ descriptor().label }}</span>`,
  styles: `
    :host {
      display: inline-flex;
    }

    .fo-badge {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      padding: 0.125rem 0.5rem;
      border: 1px solid var(--fo-badge-border);
      border-radius: 999px;
      background: var(--fo-badge-bg);
      color: var(--fo-badge-fg);
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.25rem;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /*
     * Cada tom define fundo, texto e borda. As cores são fixas em vez de
     * derivadas do tema porque o significado (aprovado = verde) não pode
     * mudar junto com a paleta da marca.
     */
    .tone-gray {
      --fo-badge-bg: #1b222a;
      --fo-badge-fg: #b4bdc6;
      --fo-badge-border: #38434e;
    }

    .tone-gray-dark {
      --fo-badge-bg: #303944;
      --fo-badge-fg: #d5dde5;
      --fo-badge-border: #566371;
    }

    .tone-blue {
      --fo-badge-bg: #182a3c;
      --fo-badge-fg: #8ec5ff;
      --fo-badge-border: #365d85;
    }

    .tone-yellow {
      --fo-badge-bg: #302918;
      --fo-badge-fg: #f4cd72;
      --fo-badge-border: #796331;
    }

    .tone-orange {
      --fo-badge-bg: #36261c;
      --fo-badge-fg: #ffb47d;
      --fo-badge-border: #875331;
    }

    .tone-indigo {
      --fo-badge-bg: #25243c;
      --fo-badge-fg: #b9b5ff;
      --fo-badge-border: #5c588b;
    }

    .tone-purple {
      --fo-badge-bg: #2c2239;
      --fo-badge-fg: #d4aff5;
      --fo-badge-border: #70518a;
    }

    .tone-green {
      --fo-badge-bg: #172a23;
      --fo-badge-fg: #79d9a7;
      --fo-badge-border: #396c53;
    }

    .tone-red {
      --fo-badge-bg: #362126;
      --fo-badge-fg: #ffa3aa;
      --fo-badge-border: #88444e;
    }

    .tone-red-dark {
      --fo-badge-bg: #742c38;
      --fo-badge-fg: #ffffff;
      --fo-badge-border: #b75d6b;
    }
  `,
})
export class StatusBadgeComponent {
  /** Valor cru do enum, como veio da API. */
  readonly value = input.required<string | null | undefined>();

  /** Conjunto ao qual o valor pertence — decide o dicionário de tradução. */
  readonly context = input.required<BadgeContext>();

  readonly descriptor = computed(() => describeStatus(this.context(), this.value()));

  protected readonly classes = computed(() => `fo-badge tone-${this.descriptor().tone}`);
}
