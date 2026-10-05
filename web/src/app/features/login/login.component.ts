import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { isApiError } from '../../core/models/api-error.model';
import { defaultRouteFor } from '../../core/auth/auth.guard';
import { AuthService, LOGIN_ROUTE } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="container">
      <div class="card">
        <h1 class="title">FieldOps</h1>
        <p class="subtitle">Acesse sua conta</p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="seu@email.com"
            />
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <mat-error>Informe um e-mail válido.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Senha</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <mat-error>Senha obrigatória.</mat-error>
            }
          </mat-form-field>

          @if (error()) {
            <p class="error-message" role="alert">{{ error() }}</p>
          }

          <button mat-flat-button type="submit" class="submit-button" [disabled]="loading()">
            {{ loading() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      background: var(--mat-sys-surface-container-lowest, #fafafa);
    }

    .container {
      width: 100%;
      max-width: 24rem;
      padding: 1rem;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 2rem;
      border-radius: 0.75rem;
      background: var(--mat-sys-surface, #fff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .title {
      margin: 0 0 0.125rem;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--mat-sys-on-surface, #1a1a1a);
    }

    .subtitle {
      margin: 0 0 1rem;
      color: var(--mat-sys-on-surface-variant, #555);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    mat-form-field {
      width: 100%;
    }

    .error-message {
      margin: 0.25rem 0;
      padding: 0.625rem 0.875rem;
      border-radius: 0.375rem;
      background: var(--mat-sys-error-container, #fce8e6);
      color: var(--mat-sys-on-error-container, #c62828);
      font-size: 0.875rem;
    }

    .submit-button {
      width: 100%;
      margin-top: 0.5rem;
    }
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: (session) => {
        // Redirecionamento por perfil (telas-frontend.md FE-W01): quem não tem
        // área administrativa não fica com sessão aberta numa tela sem destino.
        const home = defaultRouteFor(session.user.role);
        if (home === LOGIN_ROUTE) {
          this.authService.clearSession();
          this.loading.set(false);
          this.error.set(NO_ADMIN_ACCESS_MESSAGE);
          return;
        }

        const returnUrl: string =
          (this.route.snapshot.queryParams['returnUrl'] as string | undefined) ?? home;
        this.router.navigate([returnUrl]).then(
          (navigated) => {
            if (!navigated) this.loading.set(false);
          },
          () => this.loading.set(false),
        );
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(loginErrorMessage(err));
      },
    });
  }
}

const CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.';
const NO_ADMIN_ACCESS_MESSAGE =
  'Seu perfil não tem acesso à área administrativa. Técnicos devem usar o aplicativo FieldOps.';
const UNAVAILABLE_MESSAGE = 'Não foi possível entrar agora. Tente novamente em instantes.';

/**
 * Mensagem do login por tipo de falha. O `401` usa sempre a mesma frase
 * (telas-frontend.md §7.3, "mensagem única"): a API distingue senha errada de
 * conta inativa/bloqueada no `message`, em inglês, e uma mensagem distinta para
 * conta inativa revelaria que o e-mail existe (AC-AUTH). Orientação específica
 * para inativo depende da decisão D22 (docs/auditoria-frontend-backend.md §20).
 */
function loginErrorMessage(err: unknown): string {
  if (!isApiError(err)) return CREDENTIALS_MESSAGE;
  switch (err.kind) {
    case 'UNAUTHORIZED':
    case 'BAD_REQUEST':
      return CREDENTIALS_MESSAGE;
    case 'NETWORK':
      return err.userMessage;
    default:
      return UNAVAILABLE_MESSAGE;
  }
}
