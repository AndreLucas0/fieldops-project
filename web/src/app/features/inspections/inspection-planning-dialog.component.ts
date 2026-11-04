import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { AuthStore, canWrite, isApiError } from '../../core';
import type { Inspection, InspectionPriority } from '../../core/models/domain';
import { InspectionsService } from '../../core/services/resources';

function localDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

@Component({
  selector: 'app-inspection-planning-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `<h2 mat-dialog-title>Editar planejamento</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline"
          ><mat-label>Título</mat-label><input matInput formControlName="title" maxlength="200"
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Data e hora previstas</mat-label
          ><input matInput type="datetime-local" formControlName="scheduledFor" required
        /></mat-form-field>
        <mat-form-field appearance="outline"
          ><mat-label>Prioridade</mat-label
          ><mat-select formControlName="priority">
            <mat-option value="LOW">Baixa</mat-option><mat-option value="MEDIUM">Média</mat-option
            ><mat-option value="HIGH">Alta</mat-option
            ><mat-option value="CRITICAL">Crítica</mat-option>
          </mat-select></mat-form-field
        >
        <mat-form-field appearance="outline"
          ><mat-label>Instruções</mat-label
          ><textarea matInput formControlName="instructions" rows="3" maxlength="1000"></textarea>
        </mat-form-field>
        @if (error()) {
          <p role="alert">{{ error() }}</p>
        }</mat-dialog-content
      ><mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close [disabled]="saving()">Cancelar</button>
        <button matButton="filled" type="submit" [disabled]="saving() || form.invalid">
          {{ saving() ? 'Salvando…' : 'Salvar alterações' }}
        </button>
      </mat-dialog-actions>
    </form>`,
  styles: `
    .fields {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-top: 1rem;
    }
    mat-form-field {
      width: 100%;
      min-width: 0;
    }
    [role='alert'] {
      color: var(--mat-sys-error);
    }
  `,
})
export class InspectionPlanningDialogComponent {
  private readonly data = inject<{ inspection: Inspection }>(MAT_DIALOG_DATA);
  private readonly service = inject(InspectionsService);
  private readonly auth = inject(AuthStore);
  private readonly ref = inject(MatDialogRef<InspectionPlanningDialogComponent>);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    title: [this.data.inspection.title ?? '', Validators.maxLength(200)],
    scheduledFor: [localDateTime(this.data.inspection.scheduledFor), Validators.required],
    priority: [this.data.inspection.priority as InspectionPriority, Validators.required],
    instructions: [this.data.inspection.instructions ?? '', Validators.maxLength(1000)],
  });
  submit(): void {
    if (
      this.saving() ||
      !canWrite('inspections', this.auth.role()) ||
      !['DRAFT', 'ASSIGNED'].includes(this.data.inspection.status)
    )
      return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const date = new Date(value.scheduledFor);
    if (Number.isNaN(date.getTime())) {
      this.error.set('Informe uma data e hora válidas.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.service
      .update(this.data.inspection.id, {
        title: value.title.trim() || null,
        instructions: value.instructions.trim() || null,
        priority: value.priority,
        scheduledFor: date.toISOString(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (inspection) => this.ref.close(inspection),
        error: (error: unknown) =>
          this.error.set(
            isApiError(error)
              ? error.userMessage
              : 'Não foi possível atualizar. Seus dados foram preservados.',
          ),
      });
  }
}
