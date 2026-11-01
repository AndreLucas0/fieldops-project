import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, of } from 'rxjs';

import { isApiError, type ApiError, type Equipment, type InspectionSite } from '../../core';
import { NotificationService } from '../../core/notifications/notification.service';
import { EquipmentService, SitesService } from '../../core/services/resources';
import { FormFieldErrorComponent } from '../../shared/components';

export interface EquipmentFormDialogData {
  equipment?: Equipment | null;
}

@Component({
  selector: 'app-equipment-form-dialog',
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
    <h2 mat-dialog-title>{{ data.equipment ? 'Editar equipamento' : 'Cadastrar equipamento' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <mat-dialog-content class="fields">
        @if (data.equipment) {
          <div class="immutable field--wide">
            <span class="immutable__label">Local vinculado</span>
            <strong>{{ siteName() || data.equipment.siteId }}</strong>
            <small>O local e o código QR não podem ser alterados após a criação.</small>
          </div>
          <mat-form-field appearance="outline" class="field--wide">
            <mat-label>Código QR</mat-label>
            <input matInput [value]="data.equipment.qrCode" readonly />
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline" class="field--wide">
            <mat-label>Local</mat-label>
            <mat-select formControlName="siteId" required>
              @for (site of sites(); track site.id) {
                <mat-option [value]="site.id"
                  >{{ site.name }} — {{ site.city || 'Cidade não informada' }}</mat-option
                >
              }
            </mat-select>
            @if (form.controls.siteId.touched && form.controls.siteId.hasError('required')) {
              <mat-error>Selecione um local ativo.</mat-error>
            }
            <app-form-field-error field="siteId" [error]="apiError()" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="field--wide">
            <mat-label>Código QR</mat-label>
            <input matInput formControlName="qrCode" autocomplete="off" required />
            @if (form.controls.qrCode.touched && form.controls.qrCode.hasError('required')) {
              <mat-error>Informe o código QR único do equipamento.</mat-error>
            }
            <app-form-field-error field="qrCode" [error]="apiError()" />
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>Nome do equipamento</mat-label>
          <input matInput formControlName="name" maxlength="150" required />
          @if (form.controls.name.touched && form.controls.name.hasError('required')) {
            <mat-error>Informe o nome do equipamento.</mat-error>
          }
          @if (form.controls.name.touched && form.controls.name.hasError('maxlength')) {
            <mat-error>Use até 150 caracteres.</mat-error>
          }
          <app-form-field-error field="name" [error]="apiError()" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Patrimônio</mat-label>
          <input matInput formControlName="assetNumber" />
          <app-form-field-error field="assetNumber" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Número de série</mat-label>
          <input matInput formControlName="serialNumber" />
          <app-form-field-error field="serialNumber" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fabricante</mat-label>
          <input matInput formControlName="manufacturer" />
          <app-form-field-error field="manufacturer" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Modelo</mat-label>
          <input matInput formControlName="model" />
          <app-form-field-error field="model" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>Descrição</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
          <app-form-field-error field="description" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Data de instalação</mat-label>
          <input matInput type="date" formControlName="installedAt" />
          <app-form-field-error field="installedAt" [error]="apiError()" />
        </mat-form-field>
        @if (apiError() && !apiError()!.hasFieldErrors) {
          <p class="form-error" role="alert">{{ apiError()!.userMessage }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" [disabled]="saving()" (click)="close()">Cancelar</button>
        <button
          matButton="filled"
          type="submit"
          [disabled]="saving() || (!data.equipment && sites().length === 0)"
        >
          {{ saving() ? 'Salvando…' : 'Salvar equipamento' }}
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
      padding: 0.75rem 0 1rem;
    }
    .immutable__label,
    .immutable small {
      color: var(--mat-sys-on-surface-variant);
    }
    .immutable__label {
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
export class EquipmentFormDialogComponent {
  readonly data = inject<EquipmentFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<EquipmentFormDialogComponent, boolean>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly equipmentService = inject(EquipmentService);
  private readonly sitesService = inject(SitesService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sites = signal<InspectionSite[]>([]);
  protected readonly siteName = signal('');
  protected readonly saving = signal(false);
  protected readonly apiError = signal<ApiError | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    siteId: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    qrCode: ['', Validators.required],
    assetNumber: [''],
    serialNumber: [''],
    manufacturer: [''],
    model: [''],
    description: [''],
    installedAt: [''],
  });

  constructor() {
    const equipment = this.data.equipment;
    if (equipment) {
      this.form.patchValue({
        siteId: equipment.siteId,
        name: equipment.name,
        qrCode: equipment.qrCode,
        assetNumber: equipment.assetNumber ?? '',
        serialNumber: equipment.serialNumber ?? '',
        manufacturer: equipment.manufacturer ?? '',
        model: equipment.model ?? '',
        description: equipment.description ?? '',
        installedAt: equipment.installedAt ?? '',
      });
      this.sitesService
        .get(equipment.siteId)
        .pipe(
          catchError(() => of(null)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((site) => this.siteName.set(site?.name ?? ''));
    } else {
      this.loadActiveSites();
    }
  }

  private loadActiveSites(): void {
    this.sitesService
      .list({ page: 0, size: 100 })
      .pipe(
        catchError((thrown: unknown) => {
          this.notifications.error(
            isApiError(thrown) ? thrown.userMessage : 'Não foi possível carregar os locais.',
          );
          return of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 100 });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.sites.set(page.content.filter((site) => site.status === 'ACTIVE'));
        if (this.sites().length === 0)
          this.notifications.info('Cadastre um local ativo antes de adicionar equipamentos.');
      });
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
    const value = this.form.getRawValue();
    const details = {
      name: value.name.trim(),
      assetNumber: optionalText(value.assetNumber),
      serialNumber: optionalText(value.serialNumber),
      manufacturer: optionalText(value.manufacturer),
      model: optionalText(value.model),
      description: optionalText(value.description),
      installedAt: optionalText(value.installedAt),
    };
    const request = this.data.equipment
      ? this.equipmentService.update(this.data.equipment.id, details)
      : this.equipmentService.create({
          ...details,
          siteId: value.siteId,
          qrCode: value.qrCode.trim(),
        });
    request
      .pipe(
        catchError((thrown: unknown) => {
          if (isApiError(thrown)) this.apiError.set(thrown);
          else this.notifications.error('Não foi possível salvar o equipamento. Tente novamente.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((equipment) => {
        if (!equipment) return;
        this.notifications.success(
          this.data.equipment ? 'Equipamento atualizado.' : 'Equipamento cadastrado.',
        );
        this.dialogRef.close(true);
      });
  }
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}
