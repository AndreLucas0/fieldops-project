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
      --fo-badge-bg: #f1f3f5;
      --fo-badge-fg: #495057;
      --fo-badge-border: #dee2e6;
    }

    .tone-gray-dark {
      --fo-badge-bg: #495057;
      --fo-badge-fg: #ffffff;
      --fo-badge-border: #343a40;
    }

    .tone-blue {
      --fo-badge-bg: #e7f1ff;
      --fo-badge-fg: #0b4a9e;
      --fo-badge-border: #b6d4fe;
    }

    .tone-yellow {
      --fo-badge-bg: #fff6e0;
      --fo-badge-fg: #7a5200;
      --fo-badge-border: #ffe1a3;
    }

    .tone-orange {
      --fo-badge-bg: #ffeddd;
      --fo-badge-fg: #8a3d00;
      --fo-badge-border: #ffd0a8;
    }

    .tone-indigo {
      --fo-badge-bg: #e8e7ff;
      --fo-badge-fg: #35339c;
      --fo-badge-border: #c5c3ff;
    }

    .tone-purple {
      --fo-badge-bg: #f3e8ff;
      --fo-badge-fg: #5f2b91;
      --fo-badge-border: #e0c9fb;
    }

    .tone-green {
      --fo-badge-bg: #e4f8ec;
      --fo-badge-fg: #10633a;
      --fo-badge-border: #b6e6ca;
    }

    .tone-red {
      --fo-badge-bg: #fdecec;
      --fo-badge-fg: #9b1c1c;
      --fo-badge-border: #f7c6c6;
    }

    .tone-red-dark {
      --fo-badge-bg: #9b1c1c;
      --fo-badge-fg: #ffffff;
      --fo-badge-border: #7a1414;
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
