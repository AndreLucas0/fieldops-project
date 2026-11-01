import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, finalize, of } from 'rxjs';

import { isApiError, type ApiError, type Client } from '../../core';
import { NotificationService } from '../../core/notifications/notification.service';
import { ClientsService } from '../../core/services/resources';
import { FormFieldErrorComponent } from '../../shared/components';

export interface ClientFormDialogData {
  client?: Client | null;
}

@Component({
  selector: 'app-client-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormFieldErrorComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.client ? 'Editar cliente' : 'Cadastrar cliente' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="name" maxlength="150" required />
          @if (form.controls.name.touched && form.controls.name.hasError('required')) {
            <mat-error>Informe o nome do cliente.</mat-error>
          }
          @if (form.controls.name.touched && form.controls.name.hasError('maxlength')) {
            <mat-error>Use até 150 caracteres.</mat-error>
          }
          <app-form-field-error field="name" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>Razão social</mat-label>
          <input matInput formControlName="legalName" />
          <app-form-field-error field="legalName" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Documento</mat-label>
          <input matInput formControlName="document" autocomplete="off" />
          <app-form-field-error field="document" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>E-mail</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.touched && form.controls.email.hasError('email')) {
            <mat-error>Informe um e-mail válido.</mat-error>
          }
          <app-form-field-error field="email" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="field--wide">
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
          {{ saving() ? 'Salvando…' : 'Salvar cliente' }}
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
export class ClientFormDialogComponent {
  readonly data = inject<ClientFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ClientFormDialogComponent, boolean>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly clients = inject(ClientsService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saving = signal(false);
  protected readonly apiError = signal<ApiError | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    legalName: [''],
    document: [''],
    email: ['', [Validators.email]],
    phone: [''],
  });

  constructor() {
    if (this.data.client) {
      this.form.patchValue({
        name: this.data.client.name,
        legalName: this.data.client.legalName ?? '',
        document: this.data.client.document ?? '',
        email: this.data.client.email ?? '',
        phone: this.data.client.phone ?? '',
      });
    }
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close(false);
  }

  protected save(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.apiError.set(null);
    this.saving.set(true);
    const values = this.form.getRawValue();
    const payload = {
      name: values.name.trim(),
      legalName: optionalText(values.legalName),
      document: optionalText(values.document),
      email: optionalText(values.email)?.toLowerCase(),
      phone: optionalText(values.phone),
    };
    const request = this.data.client
      ? this.clients.update(this.data.client.id, payload)
      : this.clients.create(payload);

    request
      .pipe(
        catchError((thrown: unknown) => {
          if (isApiError(thrown)) this.apiError.set(thrown);
          else this.notifications.error('Não foi possível salvar o cliente. Tente novamente.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((client) => {
        if (!client) return;
        this.notifications.success(
          this.data.client ? 'Cliente atualizado.' : 'Cliente cadastrado.',
        );
        this.dialogRef.close(true);
      });
  }
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}
