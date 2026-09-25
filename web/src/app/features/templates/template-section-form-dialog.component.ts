import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { TemplateSection } from '../../core/models/domain';

export interface TemplateSectionFormData {
  /** Presente ao editar — vazio, título e descrição partem em branco. */
  section?: Pick<TemplateSection, 'title' | 'description'>;
}

export interface TemplateSectionFormResult {
  title: string;
  description: string | null;
}

/**
 * Formulário de seção do construtor (FE-W15 / TS-10-11).
 *
 * Só título e descrição — `displayOrder` é decidido pela tela que abre este
 * diálogo (nova seção vai para o fim da lista; reordenar é ação separada).
 */
@Component({
  selector: 'app-template-section-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.section ? 'Editar seção' : 'Nova seção' }}</h2>

    <mat-dialog-content class="content">
      <mat-form-field appearance="outline" class="field">
        <mat-label>Título</mat-label>
        <input
          matInput
          required
          maxlength="150"
          [ngModel]="title()"
          (ngModelChange)="title.set($event)"
        />
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Descrição</mat-label>
        <textarea
          matInput
          rows="3"
          maxlength="500"
          placeholder="Opcional"
          [ngModel]="description()"
          (ngModelChange)="description.set($event)"
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton type="button" (click)="dialogRef.close()">Cancelar</button>
      <button matButton="filled" type="button" [disabled]="!canSave()" (click)="save()">
        Salvar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 22rem;
    }

    .field {
      width: 100%;
    }
  `,
})
export class TemplateSectionFormDialogComponent {
  protected readonly dialogRef =
    inject<MatDialogRef<TemplateSectionFormDialogComponent, TemplateSectionFormResult>>(
      MatDialogRef,
    );
  protected readonly data = inject<TemplateSectionFormData>(MAT_DIALOG_DATA);

  protected readonly title = signal(this.data.section?.title ?? '');
  protected readonly description = signal(this.data.section?.description ?? '');

  protected readonly canSave = computed(() => this.title().trim().length > 0);

  protected save(): void {
    if (!this.canSave()) return;
    this.dialogRef.close({
      title: this.title().trim(),
      description: this.description().trim() || null,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class TemplateSectionFormDialogService {
  private readonly dialog = inject(MatDialog);

  open(data: TemplateSectionFormData): Observable<TemplateSectionFormResult | undefined> {
    return this.dialog
      .open<TemplateSectionFormDialogComponent, TemplateSectionFormData, TemplateSectionFormResult>(
        TemplateSectionFormDialogComponent,
        { data, width: '28rem', maxWidth: '95vw', restoreFocus: true },
      )
      .afterClosed();
  }
}