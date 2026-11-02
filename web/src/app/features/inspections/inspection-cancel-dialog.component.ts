import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, finalize, of } from 'rxjs';

import { isApiError, type ApiError, type Inspection } from '../../core';
import { NotificationService } from '../../core/notifications/notification.service';
import { InspectionsService } from '../../core/services/resources';
import { FormFieldErrorComponent } from '../../shared/components';

export interface InspectionCancelDialogData {
  inspection: Inspection;
}

export const CANCEL_REASON_MIN_LENGTH = 10;
export const CANCEL_REASON_MAX_LENGTH = 500;

/**
 * Cancelamento de inspeção (US-13 / TS-13-05).
 *
 * A justificativa é obrigatória e segue no corpo de `POST /inspections/:id/cancel`;
 * o registro de auditoria é responsabilidade do backend (TS-13-04).
 * Fecha com `true` quando o cancelamento foi concluído.
 */
@Component({
  selector: 'app-inspection-cancel-dialog',
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
    <h2 mat-dialog-title>Cancelar inspeção?</h2>
    <form [formGroup]="form" (ngSubmit)="confirm()" novalidate>
      <mat-dialog-content class="content">
        <p class="warning">
          O cancelamento não pode ser desfeito. O técnico verá a mudança na próxima sincronização.
        </p>
        <mat-form-field appearance="outline">
          <mat-label>Justificativa</mat-label>
          <textarea
            matInput
            formControlName="reason"
            rows="4"
            [attr.maxlength]="maxLength"
            required
          ></textarea>
          <mat-hint align="end">{{ form.controls.reason.value.length }}/{{ maxLength }}</mat-hint>
          @if (form.controls.reason.touched && form.controls.reason.hasError('required')) {
            <mat-error>Informe a justificativa do cancelamento.</mat-error>
          }
          @if (form.controls.reason.touched && form.controls.reason.hasError('minlength')) {
            <mat-error>Descreva o motivo com pelo menos {{ minLength }} caracteres.</mat-error>
          }
          <app-form-field-error field="reason" [error]="apiError()" />
        </mat-form-field>
        @if (apiError() && !apiError()!.hasFieldErrors) {
          <p class="form-error" role="alert">{{ apiError()!.userMessage }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" [disabled]="saving()" (click)="close()">Voltar</button>
        <button matButton="filled" type="submit" [disabled]="saving() || form.invalid">
          {{ saving() ? 'Cancelando…' : 'Cancelar inspeção' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 0.75rem;
    }
    mat-form-field {
      width: 100%;
    }
    .warning {
      margin: 0;
    }
    .form-error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class InspectionCancelDialogComponent {
  readonly data = inject<InspectionCancelDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<InspectionCancelDialogComponent, boolean>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly inspections = inject(InspectionsService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly minLength = CANCEL_REASON_MIN_LENGTH;
  protected readonly maxLength = CANCEL_REASON_MAX_LENGTH;
  protected readonly saving = signal(false);
  protected readonly apiError = signal<ApiError | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    reason: [
      '',
      [
        Validators.required,
        Validators.minLength(CANCEL_REASON_MIN_LENGTH),
        Validators.maxLength(CANCEL_REASON_MAX_LENGTH),
      ],
    ],
  });

  protected close(): void {
    if (!this.saving()) this.dialogRef.close(false);
  }

  protected confirm(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    const reason = this.form.controls.reason.value.trim();
    // Espaços em branco não contam como justificativa.
    if (this.form.invalid || reason.length < CANCEL_REASON_MIN_LENGTH) {
      this.form.controls.reason.setErrors({ minlength: true });
      return;
    }

    this.apiError.set(null);
    this.saving.set(true);
    this.inspections
      .cancel(this.data.inspection.id, reason)
      .pipe(
        catchError((thrown: unknown) => {
          if (isApiError(thrown)) this.apiError.set(thrown);
          else this.notifications.error('Não foi possível cancelar a inspeção. Tente novamente.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((inspection) => {
        if (!inspection) return;
        this.notifications.success('Inspeção cancelada.');
        this.dialogRef.close(true);
      });
  }
}
