import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Tom do cartão. `neutral` é o padrão — cor só entra quando o número tem
 * significado de estado, senão sete cartões coloridos competem entre si e
 * nenhum se destaca.
 */
export type StatTone = 'neutral' | 'good' | 'warning' | 'serious' | 'critical';

/**
 * Cartão numérico do painel.
 *
 * Contrato: rótulo em caixa de sentença, valor em destaque e ícone. O ícone e o
 * rótulo acompanham sempre a cor — `warning` e `serious` ficam abaixo de 3:1
 * sobre o fundo claro por definição da paleta de estado, e é esse par que
 * garante que a informação nunca dependa só da cor.
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
        <mat-icon class="tile__icon" aria-hidden="true">{{ icon() }}</mat-icon>
        <span class="tile__label">{{ label() }}</span>
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
      gap: 0.5rem;
      /* Sem altura declarada: o próprio grid estica os itens da fileira até a
         mesma altura. Encadear height:100% aqui fazia a trilha ficar menor que
         o conteúdo e a fileira seguinte era desenhada por cima. */
      padding: 1rem 1.125rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface);
      /* O tom colore ícone e rótulo; o fundo fica neutro para os sete cartões
         lerem como um conjunto e não como sete avisos. */
      --fo-tone: var(--mat-sys-on-surface-variant);
    }

    .tone-good {
      --fo-tone: #0ca30c;
    }
    .tone-warning {
      /* Abaixo de 3:1 sobre o branco por definição — sempre com ícone e rótulo. */
      --fo-tone: #b57b00;
    }
    .tone-serious {
      --fo-tone: #b4501f;
    }
    .tone-critical {
      --fo-tone: #d03b3b;
    }

    .tile__head {
      display: flex;
      /* Reserva a altura de duas linhas de rótulo, para o cartão com nome longo
         não destoar dos vizinhos. */
      min-height: 2.25rem;
      align-items: flex-start;
      gap: 0.375rem;
      color: var(--fo-tone);
      min-width: 0;
    }

    .tile__icon {
      flex: none;
      width: 1.125rem;
      height: 1.125rem;
      font-size: 1.125rem;
      line-height: 1.125rem;
    }

    .tile__label {
      font-size: 0.8125rem;
      font-weight: 500;
      line-height: 1.25;
      overflow-wrap: anywhere;
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
      font-weight: 600;
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
