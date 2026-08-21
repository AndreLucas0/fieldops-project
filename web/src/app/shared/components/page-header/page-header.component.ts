import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Um degrau da trilha de navegação. Sem `link`, é o degrau atual. */
export interface Breadcrumb {
  label: string;
  link?: string | unknown[];
}

/**
 * Cabeçalho de página: trilha, título, subtítulo e área de ações.
 *
 * Os botões vêm por projeção de conteúdo, com o atributo `actions` — assim
 * cada tela decide o que exibir conforme o perfil (`canWrite` de
 * `core/auth/permissions.ts`), sem o cabeçalho conhecer regra de autorização.
 *
 * ```html
 * <app-page-header title="Usuários" [breadcrumbs]="[{ label: 'Início', link: '/' }]">
 *   <button actions matButton="filled">Novo usuário</button>
 * </app-page-header>
 * ```
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="header">
      @if (breadcrumbs().length > 0) {
        <nav class="breadcrumb" aria-label="Trilha de navegação">
          <ol>
            @for (crumb of breadcrumbs(); track $index; let last = $last) {
              <li>
                @if (crumb.link && !last) {
                  <a [routerLink]="crumb.link">{{ crumb.label }}</a>
                } @else {
                  <span [attr.aria-current]="last ? 'page' : null">{{ crumb.label }}</span>
                }

                @if (!last) {
                  <span class="separator" aria-hidden="true">/</span>
                }
              </li>
            }
          </ol>
        </nav>
      }

      <div class="header__row">
        <div class="header__text">
          <h1 class="header__title">{{ title() }}</h1>

          @if (subtitle()) {
            <p class="header__subtitle">{{ subtitle() }}</p>
          }
        </div>

        <div class="header__actions">
          <ng-content select="[actions]" />
        </div>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    .header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-bottom: 1rem;
    }

    .breadcrumb ol {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .breadcrumb li {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .breadcrumb a {
      color: inherit;
      text-decoration: none;
    }

    .breadcrumb a:hover,
    .breadcrumb a:focus-visible {
      text-decoration: underline;
    }

    .separator {
      opacity: 0.6;
    }

    .header__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header__title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
      line-height: 2rem;
    }

    .header__subtitle {
      margin: 0.25rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.875rem;
    }

    .header__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly breadcrumbs = input<readonly Breadcrumb[]>([]);
}
