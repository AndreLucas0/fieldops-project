import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Tom do ícone do cartão. `neutral` é o padrão — cor só entra quando o número
 * tem significado de estado, senão os cartões competem entre si e nenhum se
 * destaca.
 */
export type StatTone = 'neutral' | 'good' | 'warning' | 'serious' | 'critical';

/**
 * Cartão numérico do painel.
 *
 * Contrato: rótulo em caixa alta à esquerda, ícone no canto direito e valor em
 * destaque. A cor fica só no ícone; o rótulo continua legível sem ela, que é o
 * que impede a informação de depender só da cor.
 *
 * O valor usa os algarismos proporcionais da fonte: `tabular-nums` deixa um
 * número como `121` frouxo em corpo grande, e serve para coluna, não para
 * número solto.
 */
@Component({
  selector: 'app-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="tile" [class]="'tone-' + tone()">
      <div class="tile__head">
        <span class="tile__label">{{ label() }}</span>
        <mat-icon class="tile__icon" aria-hidden="true">{{ icon() }}</mat-icon>
      </div>

      <p class="tile__value">
        <span class="tile__number">{{ display() }}</span>
        @if (suffix()) {
          <span class="tile__suffix">{{ suffix() }}</span>
        }
      </p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .tile {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 0;
      padding: 1.25rem;
      border: 1px solid #303842;
      border-radius: 1rem;
      background: #1a2027;
      --fo-tone: var(--mat-sys-on-surface-variant);
    }

    .tone-good {
      --fo-tone: #3fb950;
    }
    .tone-warning {
      --fo-tone: #f3ad16;
    }
    .tone-serious {
      --fo-tone: #e07a3f;
    }
    .tone-critical {
      --fo-tone: #f0545a;
    }

    .tile__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      min-width: 0;
    }

    .tile__label {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      line-height: 1.25;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }

    .tile__icon {
      flex: none;
      width: 1.125rem;
      height: 1.125rem;
      color: var(--fo-tone);
      font-size: 1.125rem;
      line-height: 1.125rem;
    }

    .tile__value {
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      color: var(--mat-sys-on-surface);
    }

    .tile__number {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    .tile__suffix {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | null | undefined>();
  readonly icon = input.required<string>();
  readonly tone = input<StatTone>('neutral');
  /** Texto curto após o número (ex.: "de 6"). */
  readonly suffix = input('');

  /**
   * Ausência de dado vira travessão, não zero: `0 atrasadas` e "não sei quantas"
   * são coisas diferentes, e o contrato marca todos os campos do resumo como
   * opcionais.
   */
  protected readonly display = computed(() => {
    const value = this.value();
    return value == null ? '—' : value.toLocaleString('pt-BR');
  });
}
