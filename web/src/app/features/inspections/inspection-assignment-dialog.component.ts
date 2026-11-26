import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY, expand, finalize, reduce } from 'rxjs';
import { AuthStore, canWrite, isApiError } from '../../core';
import type { Inspection } from '../../core/models/domain';
import { InspectionsService, UsersService, type InspectionAssignee } from '../../core/services/resources';

@Component({
  selector: 'app-inspection-assignment-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <form (ngSubmit)="submit()">
      <mat-dialog-content>
        @if (loading()) {
          <p role="status">Carregando técnicos…</p>
        } @else if (technicians().length) {
          <mat-form-field appearance="outline">
            <mat-label>Técnico responsável</mat-label>
            <mat-select [formControl]="technicianId" required>
              @for (technician of technicians(); track technician.id) {
                <mat-option [value]="technician.id">{{ technician.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        } @else if (!error()) {
          <p>Nenhum técnico ativo está disponível para esta inspeção.</p>
        }
        @if (error()) { <p role="alert">{{ error() }}</p> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close [disabled]="saving()">Cancelar</button>
        <button matButton="filled" type="submit" [disabled]="loading() || saving() || technicianId.invalid">
          {{ saving() ? 'Salvando…' : title }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `mat-form-field { width: 100%; } [role='alert'] { color: var(--mat-sys-error); }`,
})
export class InspectionAssignmentDialogComponent {
  private readonly inspection = inject<{ inspection: Inspection }>(MAT_DIALOG_DATA).inspection;
  private readonly inspections = inject(InspectionsService);
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialogRef<InspectionAssignmentDialogComponent>);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = this.inspection.status === 'DRAFT' ? 'Atribuir técnico' : 'Reatribuir técnico';
  readonly technicianId = new FormControl('', { nonNullable: true, validators: Validators.required });
  readonly technicians = signal<InspectionAssignee[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.listPage(0).pipe(
      expand(page => page.page + 1 < page.totalPages ? this.listPage(page.page + 1) : EMPTY),
      reduce((users, page) => [...users, ...page.content], [] as InspectionAssignee[]),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: users => this.technicians.set(users.filter(user =>
        this.inspection.status !== 'ASSIGNED' || user.id !== this.inspection.technicianId,
      )),
      error: () => this.error.set('Não foi possível carregar os técnicos ativos.'),
    });
  }

  submit(): void {
    if (this.loading() || this.saving() || this.technicianId.invalid ||
        !canWrite('inspections', this.auth.role()) ||
        !['DRAFT', 'ASSIGNED'].includes(this.inspection.status)) return;
    this.saving.set(true);
    this.error.set(null);
    this.inspections.assign(this.inspection.id, this.technicianId.value).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: updated => this.dialog.close(updated),
      error: (error: unknown) => this.error.set(
        isApiError(error) ? error.userMessage : 'Não foi possível atribuir a inspeção.',
      ),
    });
  }

  private listPage(page: number) {
    return this.users.listInspectionAssignees('TECHNICIAN', { page, size: 100 });
  }
}
