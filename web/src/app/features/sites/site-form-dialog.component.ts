import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, of } from 'rxjs';

import {
  ClientsService,
  isApiError,
  type ApiError,
  type Client,
  type InspectionSite,
} from '../../core';
import { SitesService } from '../../core/services/resources';
import { NotificationService } from '../../core/notifications/notification.service';
import { FormFieldErrorComponent } from '../../shared/components';

export interface SiteFormDialogData {
  site?: InspectionSite | null;
}

@Component({
  selector: 'app-site-form-dialog',
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
    <h2 mat-dialog-title>{{ data.site ? 'Editar local' : 'Cadastrar local' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <mat-dialog-content class="fields">
        @if (data.site) {
          <div class="immutable field--wide">
            <span class="immutable__label">Cliente vinculado</span>
            <strong>{{ clientName() || data.site.clientId }}</strong>
            <small>O cliente não pode ser alterado depois que o local é criado.</small>
          </div>
        } @else {
          <mat-form-field appearance="outline" class="field--wide">
            <mat-label>Cliente</mat-label>
            <mat-select formControlName="clientId" required>
              @for (client of clients(); track client.id) {
                <mat-option [value]="client.id">{{ client.name }}</mat-option>
              }
            </mat-select>
            @if (form.controls.clientId.touched && form.controls.clientId.hasError('required')) {
              <mat-error>Selecione o cliente responsável pelo local.</mat-error>
            }
            <app-form-field-error field="clientId" [error]="apiError()" />
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>Nome do local</mat-label>
          <input matInput formControlName="name" maxlength="150" required />
          @if (form.controls.name.touched && form.controls.name.hasError('required')) {
            <mat-error>Informe o nome do local.</mat-error>
          }
          @if (form.controls.name.touched && form.controls.name.hasError('maxlength')) {
            <mat-error>Use até 150 caracteres.</mat-error>
          }
          <app-form-field-error field="name" [error]="apiError()" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>Descrição</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
          <app-form-field-error field="description" [error]="apiError()" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="field--wide">
          <mat-label>Endereço</mat-label>
          <input matInput formControlName="addressLine" autocomplete="street-address" />
          <app-form-field-error field="addressLine" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cidade</mat-label>
          <input matInput formControlName="city" autocomplete="address-level2" />
          <app-form-field-error field="city" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <input matInput formControlName="state" maxlength="2" autocomplete="address-level1" />
          <app-form-field-error field="state" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>CEP</mat-label>
          <input matInput formControlName="postalCode" autocomplete="postal-code" />
          <app-form-field-error field="postalCode" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Contato local</mat-label>
          <input matInput formControlName="contactName" autocomplete="name" />
          <app-form-field-error field="contactName" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Telefone do contato</mat-label>
          <input matInput type="tel" formControlName="contactPhone" autocomplete="tel" />
          <app-form-field-error field="contactPhone" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Latitude</mat-label>
          <input matInput type="number" step="any" formControlName="latitude" />
          @if (form.controls.latitude.touched && form.controls.latitude.invalid) {
            <mat-error>Use um valor entre -90 e 90.</mat-error>
          }
          <app-form-field-error field="latitude" [error]="apiError()" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Longitude</mat-label>
          <input matInput type="number" step="any" formControlName="longitude" />
          @if (form.controls.longitude.touched && form.controls.longitude.invalid) {
            <mat-error>Use um valor entre -180 e 180.</mat-error>
          }
          <app-form-field-error field="longitude" [error]="apiError()" />
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
          [disabled]="saving() || (!data.site && clients().length === 0)"
        >
          {{ saving() ? 'Salvando…' : 'Salvar local' }}
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
export class SiteFormDialogComponent {
  readonly data = inject<SiteFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SiteFormDialogComponent, boolean>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);
  private readonly sitesService = inject(SitesService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly clients = signal<Client[]>([]);
  protected readonly clientName = signal('');
  protected readonly loadingClients = signal(false);
  protected readonly saving = signal(false);
  protected readonly apiError = signal<ApiError | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    clientId: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    addressLine: [''],
    city: [''],
    state: [''],
    postalCode: [''],
    contactName: [''],
    contactPhone: [''],
    latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
  });

  constructor() {
    const site = this.data.site;
    if (site) {
      this.form.patchValue({
        clientId: site.clientId,
        name: site.name,
        description: site.description ?? '',
        addressLine: site.addressLine ?? '',
        city: site.city ?? '',
        state: site.state ?? '',
        postalCode: site.postalCode ?? '',
        contactName: site.contactName ?? '',
        contactPhone: site.contactPhone ?? '',
        latitude: site.latitude ?? null,
        longitude: site.longitude ?? null,
      });
      this.clientsService
        .get(site.clientId)
        .pipe(
          catchError(() => of(null)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((client) => this.clientName.set(client?.name ?? ''));
    } else {
      this.loadActiveClients();
    }
  }

  private loadActiveClients(): void {
    this.loadingClients.set(true);
    this.clientsService
      .list({ page: 0, size: 100, status: 'ACTIVE' })
      .pipe(
        catchError((thrown: unknown) => {
          this.notifications.error(
            isApiError(thrown) ? thrown.userMessage : 'Não foi possível carregar os clientes.',
          );
          return of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 100 });
        }),
        finalize(() => this.loadingClients.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.clients.set(page.content);
        if (page.content.length === 0)
          this.notifications.info('Cadastre um cliente ativo antes de criar um local.');
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
      description: optionalText(value.description),
      addressLine: optionalText(value.addressLine),
      city: optionalText(value.city),
      state: optionalText(value.state)?.toUpperCase(),
      postalCode: optionalText(value.postalCode),
      contactName: optionalText(value.contactName),
      contactPhone: optionalText(value.contactPhone),
      latitude: value.latitude,
      longitude: value.longitude,
    };
    const request = this.data.site
      ? this.sitesService.update(this.data.site.id, details)
      : this.sitesService.create({ ...details, clientId: value.clientId });
    request
      .pipe(
        catchError((thrown: unknown) => {
          if (isApiError(thrown)) this.apiError.set(thrown);
          else this.notifications.error('Não foi possível salvar o local. Tente novamente.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((site) => {
        if (!site) return;
        this.notifications.success(this.data.site ? 'Local atualizado.' : 'Local cadastrado.');
        this.dialogRef.close(true);
      });
  }
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}
