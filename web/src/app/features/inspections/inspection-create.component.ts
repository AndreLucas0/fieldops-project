
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { AuthStore } from '../../core';
import type {
    Client,
    Equipment,
    InspectionPriority,
    InspectionSite,
    InspectionTemplate,
    InspectionTemplateVersionDetail,
    User,
} from '../../core/models/domain';
import {
    ClientsService,
    EquipmentService,
    InspectionsService,
    SitesService,
    TemplatesService,
    UsersService,
} from '../../core/services/resources';
import { PageHeaderComponent } from '../../shared/components';

@Component({
    selector: 'app-inspection-create',
    standalone: true,
    imports: [FormsModule, PageHeaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="page">
  <app-page-header
    title="Planejar inspeção"
    subtitle="Defina o modelo, o local e os responsáveis pela execução."
  />

  <div class="catalog-card">
    <form #form="ngForm" (ngSubmit)="submit()">
      <div class="form-card">

        <!-- Modelo -->
        <div class="field full">
          <label for="template">Modelo (versão publicada) *</label>
          <select
            id="template"
            name="template"
            required
            [ngModel]="templateId()"
            (ngModelChange)="onTemplateChange($event)"
          >
            <option value="">Selecione...</option>
            @for (template of templates(); track template.id) {
              <option [value]="template.id">{{ template.title }}</option>
            }
          </select>
        </div>

        <!-- Cliente -->
        <div class="field">
          <label for="client">Cliente *</label>
          <select
            id="client"
            name="client"
            required
            [ngModel]="clientId()"
            (ngModelChange)="onClientChange($event)"
          >
            <option value="">Selecione...</option>
            @for (client of clients(); track client.id) {
              <option [value]="client.id">{{ client.name }}</option>
            }
          </select>
        </div>

        <!-- Local -->
        <div class="field">
          <label for="site">Local *</label>
          <select
            id="site"
            name="site"
            required
            [disabled]="!clientId() || loadingSites()"
            [ngModel]="siteId()"
            (ngModelChange)="onSiteChange($event)"
          >
            <option value="">
              {{ clientId() ? 'Selecione...' : 'Escolha o cliente primeiro' }}
            </option>
            @for (site of sites(); track site.id) {
              <option [value]="site.id">{{ site.name }}</option>
            }
          </select>
        </div>

        <!-- Equipamento -->
        <div class="field">
          <label for="equipment">Equipamento</label>
          <select
            id="equipment"
            name="equipment"
            [disabled]="!siteId() || loadingEquipment()"
            [ngModel]="equipmentId()"
            (ngModelChange)="equipmentId.set($event)"
          >
            <option value="">
              {{ siteId() ? 'Selecione...' : 'Escolha o local primeiro' }}
            </option>
            @for (equipment of equipmentOptions(); track equipment.id) {
              <option [value]="equipment.id">{{ equipment.name }}</option>
            }
          </select>
        </div>

        <!-- Técnico -->
        <div class="field">
          <label for="technician">Técnico *</label>
          <select
            id="technician"
            name="technician"
            required
            [(ngModel)]="technicianId"
          >
            <option value="">Selecione...</option>
            @for (technician of technicians(); track technician.id) {
              <option [value]="technician.id">{{ technician.name }}</option>
            }
          </select>
        </div>

        <!-- Supervisor -->
        <div class="field">
          <label for="supervisor">Supervisor</label>
          <select
            id="supervisor"
            name="supervisor"
            [(ngModel)]="supervisorId"
          >
            <option value="">Selecione...</option>
            @for (supervisor of supervisors(); track supervisor.id) {
              <option [value]="supervisor.id">{{ supervisor.name }}</option>
            }
          </select>
        </div>

        <!-- Data prevista -->
        <div class="field">
          <label for="scheduledFor">Data prevista *</label>
          <input
            id="scheduledFor"
            name="scheduledFor"
            type="date"
            required
            [min]="today"
            [(ngModel)]="scheduledFor"
          />
        </div>

        <!-- Prioridade -->
        <div class="field">
          <label for="priority">Prioridade *</label>
          <select
            id="priority"
            name="priority"
            required
            [(ngModel)]="priority"
          >
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>

        <!-- Instruções -->
        <div class="field full">
          <label for="instructions">Instruções ao técnico</label>
          <textarea
            id="instructions"
            name="instructions"
            rows="4"
            maxlength="2000"
            placeholder="Descreva orientações para a execução da inspeção..."
            [(ngModel)]="instructions"
          ></textarea>
        </div>

        @if (error()) {
          <div class="message error">{{ error() }}</div>
        }

        @if (loadingInitial()) {
          <div class="message">Carregando dados do formulário...</div>
        }
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" (click)="cancel()">
          Cancelar
        </button>

        <button
          type="submit"
          class="btn-submit"
          [disabled]="form.invalid || saving() || loadingInitial() || !templateVersionId()"
        >
          {{ saving() ? 'Criando...' : 'Criar e atribuir' }}
        </button>
      </div>
    </form>
  </div>
</section>
  `,
    styles: `
   :host {
  display: block;
  min-width: 0;
}

.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.form-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.field.full {
  grid-column: 1 / -1;
}

label {
  color: #91a7c0;
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
}

input,
select,
textarea {
  width: 100%;
  min-width: 0;
  padding: 0.8rem 1rem;
  color: #f5f6f7;
  background: #101519;
  border: 1px solid #303941;
  border-radius: 0.75rem;
  font: inherit;
  outline: none;
}

input,
select {
  min-height: 2.8rem;
}

select:disabled {
  color: #7d858c;
  cursor: not-allowed;
  opacity: 0.7;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #f5a316;
}

textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--mat-sys-outline-variant);
}

button {
  min-height: 2.8rem;
  padding: 0.7rem 1.3rem;
  border-radius: 0.75rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  color: #f5f6f7;
  background: transparent;
  border: 1px solid #39434b;
}

.btn-submit {
  color: #171717;
  background: #f5a316;
  border: 1px solid #f5a316;
}

.btn-submit:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.message {
  grid-column: 1 / -1;
  color: #91a7c0;
  font-size: 0.9rem;
}

.message.error {
  color: #ff7777;
}

@media (max-width: 700px) {
  .form-card {
    grid-template-columns: 1fr;
    padding: 1rem;
    gap: 1.25rem;
  }

  .field.full {
    grid-column: auto;
  }

  .form-actions {
    flex-wrap: wrap;
    padding: 1rem;
  }
}
  `,
})
export class InspectionCreateComponent {
    private readonly clientsService = inject(ClientsService);
    private readonly sitesService = inject(SitesService);
    private readonly equipmentService = inject(EquipmentService);
    private readonly usersService = inject(UsersService);
    private readonly templatesService = inject(TemplatesService);
    private readonly inspectionsService = inject(InspectionsService);
    private readonly auth = inject(AuthStore);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly clients = signal<Client[]>([]);
    protected readonly sites = signal<InspectionSite[]>([]);
    protected readonly equipmentOptions = signal<Equipment[]>([]);
    protected readonly technicians = signal<User[]>([]);
    protected readonly supervisors = signal<User[]>([]);
    protected readonly templates = signal<InspectionTemplate[]>([]);

    protected readonly templateId = signal('');
    protected readonly templateVersionId = signal('');
    protected readonly clientId = signal('');
    protected readonly siteId = signal('');
    protected readonly equipmentId = signal('');

    protected readonly loadingInitial = signal(true);
    protected readonly loadingSites = signal(false);
    protected readonly loadingEquipment = signal(false);
    protected readonly saving = signal(false);
    protected readonly error = signal('');

    protected readonly today = new Date().toISOString().slice(0, 10);

    protected technicianId = '';
    protected supervisorId = '';
    protected scheduledFor = '';
    protected priority: InspectionPriority = 'MEDIUM';
    protected instructions = '';

    constructor() {
        this.loadInitialData();
    }

    private loadInitialData(): void {
        forkJoin({
            clients: this.clientsService.list({ page: 0, size: 100, status: 'ACTIVE' }),
            technicians: this.usersService.list({
                page: 0, size: 100, role: 'TECHNICIAN', status: 'ACTIVE',
            }),
            supervisors: this.usersService.list({
                page: 0, size: 100, role: 'SUPERVISOR', status: 'ACTIVE',
            }),
            templates: this.templatesService.list({
                page: 0, size: 100, status: 'ACTIVE',
            }),
        })
            .pipe(
                catchError(() => {
                    this.error.set('Não foi possível carregar os dados do formulário.');
                    return of(null);
                }),
                finalize(() => this.loadingInitial.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                if (!result) return;

                this.clients.set(result.clients.content);
                this.technicians.set(result.technicians.content);
                this.supervisors.set(result.supervisors.content);
                this.templates.set(result.templates.content);

                const currentUser = this.auth.user();
                if (currentUser?.role === 'SUPERVISOR') {
                    this.supervisorId = currentUser.id;
                }
            });
    }

    protected onTemplateChange(id: string): void {
        this.templateId.set(id);
        this.templateVersionId.set('');

        if (!id) return;

        this.templatesService
            .listVersions(id, { page: 0, size: 100 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (page) => {
                    const published = page.content.find(
                        (version) => version.activeForNewInspections === true,
                    );

                    if (!published) {
                        this.error.set('Este modelo não possui uma versão publicada disponível para novas inspeções.');
                        return;
                    }

                    this.error.set('');
                    this.templateVersionId.set(published.id);
                },
                error: () => this.error.set('Não foi possível carregar a versão publicada do modelo.'),
            });
    }

    protected onClientChange(id: string): void {
        this.clientId.set(id);
        this.siteId.set('');
        this.equipmentId.set('');
        this.sites.set([]);
        this.equipmentOptions.set([]);

        if (!id) return;

        this.loadingSites.set(true);
        this.sitesService
            .listByClient(id, { page: 0, size: 100 })
            .pipe(
                catchError(() => {
                    this.error.set('Não foi possível carregar os locais deste cliente.');
                    return of(null);
                }),
                finalize(() => this.loadingSites.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((page) => {
                if (page) {
                    this.sites.set(
                        page.content.filter((site) => site.status === 'ACTIVE')
                    );
                }
            });
    }

    protected onSiteChange(id: string): void {
        this.siteId.set(id);
        this.equipmentId.set('');
        this.equipmentOptions.set([]);

        if (!id) return;

        this.loadingEquipment.set(true);
        this.equipmentService
            .listBySite(id, { page: 0, size: 100, status: 'ACTIVE' })
            .pipe(
                catchError(() => {
                    this.error.set('Não foi possível carregar os equipamentos deste local.');
                    return of(null);
                }),
                finalize(() => this.loadingEquipment.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((page) => {
                if (page) this.equipmentOptions.set(page.content);
            });
    }

    protected cancel(): void {
        void this.router.navigate(['/inspections']);
    }

    protected submit(): void {
        if (
            !this.templateVersionId() ||
            !this.clientId() ||
            !this.siteId() ||
            !this.technicianId ||
            !this.scheduledFor
        ) {
            this.error.set('Preencha todos os campos obrigatórios.');
            return;
        }

        const scheduledDate = new Date(`${this.scheduledFor}T12:00:00`);

        this.saving.set(true);
        this.error.set('');

        this.inspectionsService
            .create({
                templateVersionId: this.templateVersionId(),
                clientId: this.clientId(),
                siteId: this.siteId(),
                equipmentId: this.equipmentId() || null,
                technicianId: this.technicianId,
                supervisorId: this.supervisorId || null,
                title: this.templates().find((item) => item.id === this.templateId())?.title,
                instructions: this.instructions.trim() || null,
                priority: this.priority,
                scheduledFor: scheduledDate.toISOString(),
            })
            .pipe(
                catchError(() => {
                    this.error.set('Não foi possível criar a inspeção. Verifique os dados e tente novamente.');
                    return of(null);
                }),
                finalize(() => this.saving.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((inspection) => {
                if (inspection) {
                    void this.router.navigate(['/inspections']);
                }
            });
    }
}
