import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';

import type { ResponseType, TemplateItem } from '../../core/models/domain';

/** Rótulos em português dos 7 tipos de resposta do MVP (docs/modelo-de-dados.md §10.7.4). */
export const RESPONSE_TYPE_LABELS: Record<ResponseType, string> = {
  TEXT_SHORT: 'Texto curto',
  TEXT_LONG: 'Texto longo',
  NUMBER: 'Número',
  BOOLEAN: 'Sim/Não',
  CONFORMITY: 'Conformidade',
  SINGLE_CHOICE: 'Seleção única',
  DATE: 'Data',
};

const RESPONSE_TYPES: readonly ResponseType[] = [
  'TEXT_SHORT',
  'TEXT_LONG',
  'NUMBER',
  'BOOLEAN',
  'CONFORMITY',
  'SINGLE_CHOICE',
  'DATE',
];

/** `required`, exigências na falha e ordem ficam de fora — controlados fora do formulário. */
type ItemFormSeed = Pick<
  TemplateItem,
  'code' | 'title' | 'description' | 'responseType' | 'required'
> &
  Partial<
    Pick<TemplateItem, 'observationRequiredOnFailure' | 'evidenceRequiredOnFailure' | 'optionsJson'>
  >;

export interface TemplateItemFormData {
  /** Presente ao editar. */
  item?: ItemFormSeed;
}

export interface TemplateItemFormResult {
  code: string | null;
  title: string;
  description: string | null;
  responseType: ResponseType;
  required: boolean;
  observationRequiredOnFailure: boolean;
  evidenceRequiredOnFailure: boolean;
  optionsJson: { options: { value: string; label: string }[] } | null;
}

/**
 * Formulário de item do checklist (docs/telas-frontend.md §9.5, FE-W15 / TS-10-11).
 *
 * "Exige observação/evidência na falha" só aparece para `CONFORMITY` e
 * `BOOLEAN` — únicos tipos com noção de "falha" no MVP (§9.7). O editor de
 * opções só aparece para `SINGLE_CHOICE`; o formato de `optionsJson` segue o
 * mesmo usado pelo conjunto fictício: `{ options: [{ value, label }] }`.
 */
@Component({
  selector: 'app-template-item-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Editar item' : 'Novo item' }}</h2>

    <mat-dialog-content class="content">
      <div class="row">
        <mat-form-field appearance="outline" class="field field--code">
          <mat-label>Código</mat-label>
          <input
            matInput
            maxlength="50"
            placeholder="Opcional"
            [ngModel]="code()"
            (ngModelChange)="code.set($event)"
          />
        </mat-form-field>

        <mat-form-field appearance="outline" class="field">
          <mat-label>Tipo de resposta</mat-label>
          <mat-select
            required
            [ngModel]="responseType()"
            (ngModelChange)="responseType.set($event)"
          >
            @for (type of responseTypes; track type) {
              <mat-option [value]="type">{{ labelFor(type) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Título / pergunta</mat-label>
        <input
          matInput
          required
          maxlength="300"
          [ngModel]="title()"
          (ngModelChange)="title.set($event)"
        />
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Descrição / ajuda</mat-label>
        <textarea
          matInput
          rows="2"
          maxlength="1000"
          placeholder="Opcional"
          [ngModel]="description()"
          (ngModelChange)="description.set($event)"
        ></textarea>
      </mat-form-field>

      @if (responseType() === 'SINGLE_CHOICE') {
        <div class="options">
          <p class="options__label">Opções</p>
          @for (option of options(); track $index; let i = $index) {
            <div class="option-row">
              <mat-form-field appearance="outline" class="field" subscriptSizing="dynamic">
                <mat-label>Rótulo {{ i + 1 }}</mat-label>
                <input
                  matInput
                  [ngModel]="option.label"
                  (ngModelChange)="setOptionLabel(i, $event)"
                />
              </mat-form-field>
              <button
                matIconButton
                type="button"
                aria-label="Remover opção"
                (click)="removeOption(i)"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
          <button matButton type="button" (click)="addOption()">
            <mat-icon>add</mat-icon>
            Adicionar opção
          </button>
        </div>
      }

      <mat-checkbox [ngModel]="required()" (ngModelChange)="required.set($event)"
        >Obrigatório</mat-checkbox
      >

      @if (showsFailureRules()) {
        <mat-checkbox
          [ngModel]="observationRequiredOnFailure()"
          (ngModelChange)="observationRequiredOnFailure.set($event)"
        >
          Exige observação na falha
        </mat-checkbox>
        <mat-checkbox
          [ngModel]="evidenceRequiredOnFailure()"
          (ngModelChange)="evidenceRequiredOnFailure.set($event)"
        >
          Exige evidência na falha
        </mat-checkbox>
      }
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
      gap: 0.25rem;
      min-width: 24rem;
    }

    .row {
      display: flex;
      gap: 0.75rem;
    }

    .field {
      width: 100%;
    }

    .field--code {
      flex: 0 0 8rem;
    }

    .options {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.5rem;
      padding: 0.75rem;
      margin: 0.25rem 0 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .options__label {
      margin: 0 0 0.25rem;
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .option-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `,
})
export class TemplateItemFormDialogComponent {
  protected readonly dialogRef =
    inject<MatDialogRef<TemplateItemFormDialogComponent, TemplateItemFormResult>>(MatDialogRef);
  protected readonly data = inject<TemplateItemFormData>(MAT_DIALOG_DATA);

  protected readonly responseTypes = RESPONSE_TYPES;

  protected readonly code = signal(this.data.item?.code ?? '');
  protected readonly title = signal(this.data.item?.title ?? '');
  protected readonly description = signal(this.data.item?.description ?? '');
  protected readonly responseType = signal<ResponseType>(
    this.data.item?.responseType ?? 'TEXT_SHORT',
  );
  protected readonly required = signal(this.data.item?.required ?? false);
  protected readonly observationRequiredOnFailure = signal(
    this.data.item?.observationRequiredOnFailure ?? false,
  );
  protected readonly evidenceRequiredOnFailure = signal(
    this.data.item?.evidenceRequiredOnFailure ?? false,
  );
  protected readonly options = signal<{ value: string; label: string }[]>(
    (
      this.data.item?.optionsJson as { options?: { value: string; label: string }[] } | null
    )?.options?.map((option) => ({ ...option })) ?? [],
  );

  protected readonly showsFailureRules = computed(() =>
    (['CONFORMITY', 'BOOLEAN'] as ResponseType[]).includes(this.responseType()),
  );

  protected readonly canSave = computed(() => this.title().trim().length > 0);

  protected labelFor(type: ResponseType): string {
    return RESPONSE_TYPE_LABELS[type];
  }

  protected addOption(): void {
    this.options.update((current) => [...current, { value: '', label: '' }]);
  }

  protected removeOption(index: number): void {
    this.options.update((current) => current.filter((_, i) => i !== index));
  }

  protected setOptionLabel(index: number, label: string): void {
    this.options.update((current) =>
      current.map((option, i) => (i === index ? { value: label, label } : option)),
    );
  }

  protected save(): void {
    if (!this.canSave()) return;

    const isSingleChoice = this.responseType() === 'SINGLE_CHOICE';
    const cleanOptions = this.options()
      .map((option) => ({ ...option, label: option.label.trim() }))
      .filter((option) => option.label.length > 0);

    this.dialogRef.close({
      code: this.code().trim() || null,
      title: this.title().trim(),
      description: this.description().trim() || null,
      responseType: this.responseType(),
      required: this.required(),
      observationRequiredOnFailure: this.showsFailureRules()
        ? this.observationRequiredOnFailure()
        : false,
      evidenceRequiredOnFailure: this.showsFailureRules()
        ? this.evidenceRequiredOnFailure()
        : false,
      optionsJson: isSingleChoice && cleanOptions.length > 0 ? { options: cleanOptions } : null,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class TemplateItemFormDialogService {
  private readonly dialog = inject(MatDialog);

  open(data: TemplateItemFormData): Observable<TemplateItemFormResult | undefined> {
    return this.dialog
      .open<TemplateItemFormDialogComponent, TemplateItemFormData, TemplateItemFormResult>(
        TemplateItemFormDialogComponent,
        { data, width: '32rem', maxWidth: '95vw', restoreFocus: true },
      )
      .afterClosed();
  }
}