import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, of } from 'rxjs';

import { isApiError, type ApiError, type User } from '../../core';
import type { UserRole } from '../../core/models/domain';
import { NotificationService } from '../../core/notifications/notification.service';
import { UsersService } from '../../core/services/resources';
import { FormFieldErrorComponent } from '../../shared/components';

export interface UserFormDialogData {
  user?: User | null;
}

const ROLE_OPTIONS: readonly { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'TECHNICIAN', label: 'Técnico' },
  { value: 'CLIENT_VIEWER', label: 'Cliente' },
];

@Component({
  selector: 'app-user-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormFieldErrorComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.user ? 'Editar usuário' : 'Cadastrar usuário' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="name" maxlength="150" autocomplete="name" required />
          @if (form.controls.name.touched && form.controls.name.hasError('required')) {
            <mat-error>Informe o nome do usuário.</mat-error>
          }
          @if (form.controls.name.touched && form.controls.name.hasError('maxlength')) {
            <mat-error>Use até 150 caracteres.</mat-error>
          }
          <app-form-field-error field="name" [error]="apiError()" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>E-mail</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
            maxlength="255"
            autocomplete="email"
            required
          />
          @if (form.controls.email.touched && form.controls.email.hasError('required')) {
            <mat-error>Informe o e-mail.</mat-error>
          }
          @if (form.controls.email.touched && form.controls.email.hasError('email')) {
            <mat-error>Informe um e-mail válido.</mat-error>
          }
          @if (form.controls.email.touched && form.controls.email.hasError('maxlength')) {
            <mat-error>Use até 255 caracteres.</mat-error>
          }
          <app-form-field-error field="email" [error]="apiError()" />
        </mat-form-field>

        @if (!data.user) {
          <mat-form-field appearance="outline" class="field--wide">
            <mat-label>Senha inicial</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              maxlength="255"
              autocomplete="new-password"
              required
            />
            @if (form.controls.password.touched && form.controls.password.hasError('required')) {
              <mat-error>Informe a senha inicial.</mat-error>
            }
            @if (form.controls.password.touched && form.controls.password.hasError('minlength')) {
              <mat-error>A senha deve ter pelo menos 8 caracteres.</mat-error>
            }
            @if (form.controls.password.touched && form.controls.password.hasError('maxlength')) {
              <mat-error>Use até 255 caracteres.</mat-error>
            }
            <app-form-field-error field="password" [error]="apiError()" />
          </mat-form-field>
        } @else {
          <div class="immutable field--wide">
            <span>Situação</span>
            <strong>{{ statusLabel(data.user.status) }}</strong>
            <small>A situação é alterada pelas ações da lista de usuários.</small>
          </div>
        }

        <mat-form-field appearance="outline">
          <mat-label>Perfil</mat-label>
          <mat-select formControlName="role" required>
            @for (option of roleOptions; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
          @if (form.controls.role.touched && form.controls.role.hasError('required')) {
            <mat-error>Selecione um perfil.</mat-error>
          }
          <app-form-field-error field="role" [error]="apiError()" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Telefone</mat-label>
          <input matInput type="tel" formControlName="phone" autocomplete="tel" />
          <app-form-field-error field="phone" [error]="apiError()" />
        </mat-form-field>

        @if (apiError() && !apiError()!.hasFieldErrors) {
          <p class="form-error" role="alert">{{ apiError()!.userMessage }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" [disabled]="saving()" (click)="close()">Cancelar</button>
        <button matButton="filled" type="submit" [disabled]="saving()">
          {{ saving() ? 'Salvando…' : 'Salvar usuário' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.25rem 0.75rem;
      padding-top: 0.75rem;
    }
    .field--wide,
    .form-error {
      grid-column: 1 / -1;
    }
    mat-form-field {
      width: 100%;
    }
    .immutable {
      display: grid;
      gap: 0.25rem;
      padding: 0.5rem 0 1rem;
    }
    .immutable span,
    .immutable small {
      color: var(--mat-sys-on-surface-variant);
    }
    .immutable span {
      font-size: 0.75rem;
    }
    .form-error {
      margin: 0;
      color: var(--mat-sys-error);
    }
    @media (max-width: 560px) {
      .fields {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class UserFormDialogComponent {
  readonly data = inject<UserFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<UserFormDialogComponent, boolean>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly users = inject(UsersService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly saving = signal(false);
  protected readonly apiError = signal<ApiError | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(255)]],
    role: ['' as UserRole | '', Validators.required],
    phone: [''],
  });

  constructor() {
    if (this.data.user) {
      this.form.patchValue({
        name: this.data.user.name,
        email: this.data.user.email,
        role: this.data.user.role,
        phone: this.data.user.phone ?? '',
      });
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity();
    }
  }

  protected statusLabel(status: User['status']): string {
    return { ACTIVE: 'Ativo', INACTIVE: 'Inativo', BLOCKED: 'Bloqueado' }[status];
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close(false);
  }

  protected save(): void {
    if (this.saving()) return;
    this.form.controls.name.setValue(this.form.controls.name.value.trim());
    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.apiError.set(null);
    this.saving.set(true);
    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      email: value.email.trim().toLowerCase(),
      role: value.role as UserRole,
      phone: optionalText(value.phone),
    };
    const request = this.data.user
      ? this.users.update(this.data.user.id, payload)
      : this.users.create({ ...payload, password: value.password });
    request
      .pipe(
        catchError((thrown: unknown) => {
          if (isApiError(thrown)) this.apiError.set(thrown);
          else this.notifications.error('Não foi possível salvar o usuário. Tente novamente.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((user) => {
        if (!user) return;
        this.notifications.success(this.data.user ? 'Usuário atualizado.' : 'Usuário cadastrado.');
        this.dialogRef.close(true);
      });
  }
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}
