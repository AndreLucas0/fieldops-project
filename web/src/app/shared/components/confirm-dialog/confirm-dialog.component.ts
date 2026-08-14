import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { map, type Observable } from 'rxjs';

/** Campo de texto exigido antes de confirmar (motivo, justificativa). */
export interface ConfirmDialogTextField {
  label: string;
  placeholder?: string;
  hint?: string;
  /** Mínimo de caracteres úteis. Padrão: 1. */
  minLength?: number;
  maxLength?: number;
  /** Área de texto em vez de linha única. Padrão: `true`. */
  multiline?: boolean;
}

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para ações destrutivas (cancelar, reprovar, excluir). */
  variant?: 'danger' | 'warning' | 'primary';
  /** Presente, o botão confirmar fica bloqueado enquanto estiver vazio. */
  requiredTextField?: ConfirmDialogTextField;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
  /** Só presente quando `requiredTextField` foi pedido. */
  textValue?: string;
}

/**
 * Confirmação de ação, com campo obrigatório opcional.
 *
 * Existe porque várias ações do contrato exigem justificativa antes de
 * chamar a API — `CancelInspectionRequest.reason` e
 * `RejectInspectionRequest.reason` (RN-080, AC-REVIEW). Bloquear o botão até
 * o campo estar preenchido evita o `400` garantido do servidor.
 *
 * Abra pelo `ConfirmDialogService`, não diretamente pelo `MatDialog`.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title class="title">
      <mat-icon [class]="'icon icon--' + variant()" aria-hidden="true">{{ icon() }}</mat-icon>
      {{ data.title }}
    </h2>

    <mat-dialog-content>
      <p class="message">{{ data.message }}</p>

      @if (data.requiredTextField; as field) {
        <mat-form-field appearance="outline" class="field">
          <mat-label>{{ field.label }}</mat-label>

          @if (field.multiline ?? true) {
            <textarea
              matInput
              rows="4"
              required
              [maxlength]="field.maxLength ?? null"
              [placeholder]="field.placeholder ?? ''"
              [ngModel]="text()"
              (ngModelChange)="text.set($event)"
            ></textarea>
          } @else {
            <input
              matInput
              type="text"
              required
              [maxlength]="field.maxLength ?? null"
              [placeholder]="field.placeholder ?? ''"
              [ngModel]="text()"
              (ngModelChange)="text.set($event)"
            />
          }

          @if (field.hint) {
            <mat-hint>{{ field.hint }}</mat-hint>
          }
        </mat-form-field>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton type="button" (click)="cancel()">
        {{ data.cancelLabel ?? 'Cancelar' }}
      </button>

      <button
        matButton="filled"
        type="button"
        [class]="'confirm confirm--' + variant()"
        [disabled]="!canConfirm()"
        (click)="confirm()"
      >
        {{ data.confirmLabel ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .icon--danger {
      color: var(--mat-sys-error);
    }

    .icon--warning {
      color: #b25e00;
    }

    .icon--primary {
      color: var(--mat-sys-primary);
    }

    .message {
      margin: 0 0 1rem;
      white-space: pre-line;
    }

    .field {
      width: 100%;
    }

    .confirm--danger {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
})
export class ConfirmDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<ConfirmDialogComponent, ConfirmDialogResult>>(MatDialogRef);

  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  protected readonly text = signal('');

  protected readonly variant = computed(() => this.data.variant ?? 'primary');

  protected readonly icon = computed(() => {
    switch (this.variant()) {
      case 'danger':
        return 'error_outline';
      case 'warning':
        return 'warning_amber';
      default:
        return 'help_outline';
    }
  });

  /**
   * Só o conteúdo útil conta: espaços em branco não satisfazem um campo
   * obrigatório, e o servidor recusaria do mesmo jeito.
   */
  protected readonly canConfirm = computed(() => {
    const field = this.data.requiredTextField;
    if (!field) return true;
    return this.text().trim().length >= (field.minLength ?? 1);
  });

  protected confirm(): void {
    if (!this.canConfirm()) return;

    this.dialogRef.close({
      confirmed: true,
      ...(this.data.requiredTextField ? { textValue: this.text().trim() } : {}),
    });
  }

  protected cancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}

/**
 * Abre a confirmação e devolve sempre um resultado — fechar pelo fundo ou
 * pelo Esc equivale a cancelar, então a tela não precisa tratar `undefined`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  open(data: ConfirmDialogData): Observable<ConfirmDialogResult> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, ConfirmDialogResult>(
        ConfirmDialogComponent,
        {
          data,
          width: '32rem',
          maxWidth: '95vw',
          autoFocus: data.requiredTextField ? 'first-tabbable' : 'dialog',
          restoreFocus: true,
        },
      )
      .afterClosed()
      .pipe(map((result) => result ?? { confirmed: false }));
  }
}
