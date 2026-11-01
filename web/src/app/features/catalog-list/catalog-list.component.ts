import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, filter, finalize, forkJoin, of, switchMap, type Observable } from 'rxjs';

import { AuthStore, canWrite, isApiError, type ApiError } from '../../core';
import type {
  Client,
  Equipment,
  Inspection,
  InspectionSite,
  NonConformity,
  User,
} from '../../core/models/domain';
import { emptyPage, type Page, type PageParams, type Sort } from '../../core/models/page.model';
import {
  ClientsService,
  EquipmentService,
  InspectionsService,
  NonConformitiesService,
  SitesService,
  UsersService,
  type ClientFilters,
  type EquipmentFilters,
  type NonConformityFilters,
  type SiteFilters,
  type UserFilters,
} from '../../core/services/resources';
import {
  DataTableComponent,
  PageHeaderComponent,
  statusLabel,
  statusOptions,
  type ActiveFilter,
  type TableColumn,
  type RowActionEvent,
  ConfirmDialogService,
} from '../../shared/components';
import { NotificationService } from '../../core/notifications/notification.service';
import { SiteFormDialogComponent } from '../sites/site-form-dialog.component';
import { EquipmentFormDialogComponent } from '../equipment/equipment-form-dialog.component';
import { EquipmentHistoryDialogComponent } from '../equipment/equipment-history-dialog.component';
import { EquipmentQrDialogComponent } from '../equipment/equipment-qr-dialog.component';
import { UserFormDialogComponent } from '../users/user-form-dialog.component';
import { NonConformityDetailDialogComponent } from '../non-conformities/non-conformity-detail-dialog.component';

type CatalogKey = 'users' | 'sites' | 'equipment' | 'non-conformities';
type CatalogRow = User | InspectionSite | Equipment | NonConformity;

const PAGE_CONFIG: Record<
  CatalogKey,
  { title: string; subtitle: string; empty: string; icon: string }
> = {
  users: {
    title: 'Usuários',
    subtitle: 'Acessos e perfis da plataforma.',
    empty: 'Ainda não há usuários cadastrados.',
    icon: 'group',
  },
  sites: {
    title: 'Locais',
    subtitle: 'Locais de inspeção vinculados aos clientes.',
    empty: 'Ainda não há locais cadastrados.',
    icon: 'location_on',
  },
  equipment: {
    title: 'Equipamentos',
    subtitle: 'Ativos identificados para inspeção.',
    empty: 'Ainda não há equipamentos cadastrados.',
    icon: 'precision_manufacturing',
  },
  'non-conformities': {
    title: 'Não conformidades',
    subtitle: 'Desvios registrados durante as inspeções.',
    empty: 'Ainda não há não conformidades registradas.',
    icon: 'report_problem',
  },
};

@Component({
  selector: 'app-catalog-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    DataTableComponent,
    PageHeaderComponent,
  ],
  template: `
    <section class="page">
      <app-page-header [title]="config().title" [subtitle]="config().subtitle">
        @if (kind() === 'sites' && canWrite('sites')) {
          <button actions matButton="filled" type="button" (click)="openSiteForm()">
            <mat-icon>add</mat-icon>
            Novo local
          </button>
        }
        @if (kind() === 'users' && canWrite('users')) {
          <button actions matButton="filled" type="button" (click)="openUserForm()">
            <mat-icon>add</mat-icon>
            Novo usuário
          </button>
        }
        @if (kind() === 'equipment' && canWrite('equipment')) {
          <button actions matButton="filled" type="button" (click)="openEquipmentForm()">
            <mat-icon>add</mat-icon>
            Novo equipamento
          </button>
        }
      </app-page-header>
      <div class="catalog-card">
        <div class="filters" [attr.aria-label]="'Filtros de ' + config().title.toLowerCase()">
          @if (kind() !== 'non-conformities') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ kind() === 'users' ? 'Nome' : 'Buscar' }}</mat-label>
              <input
                matInput
                [ngModel]="name()"
                (ngModelChange)="setName($event)"
                placeholder="Digite para buscar"
              />
            </mat-form-field>
          }
          @if (kind() === 'users') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>E-mail</mat-label>
              <input
                matInput
                type="email"
                [ngModel]="email()"
                (ngModelChange)="setEmail($event)"
                placeholder="nome@empresa.com"
              />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Perfil</mat-label>
              <mat-select [ngModel]="role()" (ngModelChange)="setRole($event)">
                <mat-option [value]="null">Todos</mat-option>
                <mat-option value="ADMIN">Administrador</mat-option>
                <mat-option value="SUPERVISOR">Supervisor</mat-option>
                <mat-option value="TECHNICIAN">Técnico</mat-option>
                <mat-option value="CLIENT_VIEWER">Cliente</mat-option>
              </mat-select>
            </mat-form-field>
          }
          @if (kind() === 'users' || kind() === 'equipment') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Situação</mat-label>
              <mat-select [ngModel]="status()" (ngModelChange)="setStatus($event)">
                <mat-option [value]="null">Todas</mat-option>
                @for (option of statusChoices(); track option.value) {
                  <mat-option [value]="option.value">{{ option.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          @if (kind() === 'non-conformities') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Criticidade</mat-label>
              <mat-select [ngModel]="severity()" (ngModelChange)="setSeverity($event)">
                <mat-option [value]="null">Todas</mat-option>
                @for (option of severityChoices; track option.value) {
                  <mat-option [value]="option.value">{{ option.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Inspeção</mat-label>
              <mat-select [ngModel]="inspectionId()" (ngModelChange)="setInspectionId($event)">
                <mat-option [value]="null">Todas as inspeções</mat-option>
                @for (inspection of inspectionChoices(); track inspection.id) {
                  <mat-option [value]="inspection.id">
                    {{ inspection.title || 'Inspeção ' + inspection.id.slice(0, 8) }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          @if (kind() === 'equipment') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="qr-search">
              <mat-label>Buscar por QR</mat-label>
              <input
                matInput
                [ngModel]="qrCode()"
                (ngModelChange)="qrCode.set($event)"
                (keydown.enter)="$event.preventDefault(); lookupQr()"
                placeholder="Leia ou digite o código"
              />
              <button
                matSuffix
                mat-icon-button
                type="button"
                aria-label="Buscar equipamento pelo QR Code"
                (click)="lookupQr()"
              >
                <mat-icon>qr_code_scanner</mat-icon>
              </button>
            </mat-form-field>
          }
        </div>
        <app-data-table
          [columns]="columns()"
          [data]="data()"
          [loading]="loading()"
          [error]="error()"
          [activeFilters]="activeFilters()"
          [sort]="sort()"
          [ariaLabel]="config().title"
          [emptyIcon]="config().icon"
          [emptyTitle]="'Nenhum registro encontrado'"
          [emptyMessage]="emptyMessage()"
          (pageChange)="onPage($event)"
          (sortChange)="onSort($event)"
          (filterChange)="onFilter($event)"
          (rowAction)="onRowAction($event)"
          (retry)="retry()"
        />
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
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .filters mat-form-field {
      flex: 1 1 14rem;
      max-width: 22rem;
    }
    .qr-search {
      flex-basis: 18rem !important;
    }
  `,
})
export class CatalogListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmation = inject(ConfirmDialogService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly users = inject(UsersService);
  private readonly sites = inject(SitesService);
  private readonly equipment = inject(EquipmentService);
  private readonly inspections = inject(InspectionsService);
  private readonly nonConformities = inject(NonConformitiesService);
  private readonly clients = inject(ClientsService);

  protected readonly kind = computed(() => {
    const key = this.routeData()['catalog'] as CatalogKey | undefined;
    return key && key in PAGE_CONFIG ? key : 'users';
  });
  protected readonly config = computed(() => PAGE_CONFIG[this.kind()]);
  private readonly contextId = computed(() => {
    const params = this.queryParams();
    const routeParams = this.routeParams();
    return this.kind() === 'sites'
      ? (routeParams.get('clientId') ?? params.get('clientId'))
      : this.kind() === 'equipment'
        ? (routeParams.get('siteId') ?? params.get('siteId'))
        : null;
  });
  protected readonly statusChoices = computed(() =>
    statusOptions(this.kind() === 'users' ? 'user' : 'equipment'),
  );
  protected readonly severityChoices = statusOptions('severity');
  protected readonly data = signal<Page<CatalogRow>>(emptyPage());
  private readonly clientNames = signal<Record<string, string>>({});
  private readonly siteNames = signal<Record<string, string>>({});
  private readonly equipmentCounts = signal<Record<string, number | null>>({});
  private readonly inspectionNames = signal<Record<string, string>>({});
  private readonly evidenceCounts = signal<Record<string, number | null>>({});
  protected readonly inspectionChoices = signal<Inspection[]>([]);
  private clientNamesRequestId = 0;
  private siteNamesRequestId = 0;
  private equipmentCountsRequestId = 0;
  private inspectionDetailsRequestId = 0;
  private inspectionChoicesRequestId = 0;
  private dataRequestId = 0;
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly role = signal<UserFilters['role'] | null>(null);
  protected readonly status = signal<UserFilters['status'] | EquipmentFilters['status'] | null>(
    null,
  );
  protected readonly severity = signal<NonConformityFilters['severity'] | null>(null);
  protected readonly inspectionId = signal<NonConformityFilters['inspectionId'] | null>(null);
  protected readonly qrCode = signal('');
  private readonly qrSearchActive = signal(false);
  private readonly params = signal<PageParams>({ page: 0, size: 20 });
  protected readonly sort = computed<Sort | null>(() => {
    const value = this.params().sort;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Sort) : null;
  });
  protected readonly columns = computed<readonly TableColumn<CatalogRow>[]>(() => {
    switch (this.kind()) {
      case 'users':
        return [
          { field: 'name', label: 'Nome', secondaryField: 'email', sortable: true },
          {
            field: 'role',
            label: 'Perfil',
            sortable: true,
            type: 'badge',
            badgeContext: 'userRole',
          },
          {
            field: 'status',
            label: 'Situação',
            type: 'badge',
            badgeContext: 'user',
            align: 'center',
          },
          { field: 'lastAccess', label: 'Último acesso', emptyText: '—' },
          {
            field: 'actions',
            label: 'Ações',
            type: 'actions',
            actionsInline: true,
            actions: [
              {
                id: 'edit-user',
                label: 'Editar',
                icon: 'edit',
                visible: () => this.canWrite('users'),
              },
              {
                id: 'activate-user',
                label: 'Ativar',
                icon: 'check_circle',
                visible: (row) => this.canWrite('users') && (row as User).status !== 'ACTIVE',
              },
              {
                id: 'deactivate-user',
                label: 'Inativar',
                icon: 'block',
                visible: (row) => this.canWrite('users') && (row as User).status === 'ACTIVE',
              },
              {
                id: 'block-user',
                label: 'Bloquear',
                icon: 'lock',
                danger: true,
                visible: (row) => this.canWrite('users') && (row as User).status !== 'BLOCKED',
              },
              {
                id: 'reset-user-password',
                label: 'Redefinir senha',
                icon: 'key',
                visible: () => this.canWrite('users'),
              },
            ],
          },
        ];
      case 'sites':
        return [
          { field: 'name', label: 'Local', sortable: true },
          {
            field: 'clientId',
            label: 'Cliente',
            format: (value) => this.clientNames()[String(value)] ?? String(value ?? ''),
          },
          {
            field: 'addressLine',
            label: 'Endereço',
            format: (_value, row) => {
              const site = row as InspectionSite;
              const cityState = [site.city, site.state].filter(Boolean).join('/');
              return [site.addressLine, cityState].filter(Boolean).join(' — ') || '—';
            },
          },
          {
            field: 'latitude',
            label: 'Coordenadas',
            format: (_value, row) => {
              const site = row as InspectionSite;
              if (site.latitude == null || site.longitude == null) return '—';
              return `${site.latitude.toFixed(2)} , ${site.longitude.toFixed(2)}`;
            },
          },
          {
            field: 'contactName',
            label: 'Contato',
            secondaryField: 'contactPhone',
            emptyText: '—',
          },
          {
            field: 'id',
            label: 'Equipamentos',
            type: 'link',
            align: 'center',
            link: (row) => ['/sites', row.id, 'equipment'],
            format: (_value, row) => {
              const count = this.equipmentCounts()[row.id];
              if (count === undefined) return '…';
              if (count === null) return '—';
              return `${count} ${count === 1 ? 'item' : 'itens'}`;
            },
          },
          {
            field: 'status',
            label: 'Situação',
            type: 'badge',
            badgeContext: 'user',
            align: 'center',
          },
          {
            field: 'actions',
            label: 'Ações',
            type: 'actions',
            actionsInline: true,
            actions: [
              {
                id: 'edit-site',
                label: 'Editar',
                icon: 'edit',
                visible: () => this.canWrite('sites'),
              },
              {
                id: 'deactivate-site',
                label: 'Inativar',
                icon: 'block',
                visible: (row) =>
                  this.canWrite('sites') && (row as InspectionSite).status === 'ACTIVE',
              },
              {
                id: 'activate-site',
                label: 'Ativar',
                icon: 'check_circle',
                visible: (row) =>
                  this.canWrite('sites') && (row as InspectionSite).status === 'INACTIVE',
              },
            ],
          },
        ];
      case 'equipment':
        return [
          { field: 'name', label: 'TAG', sortable: true },
          { field: 'assetNumber', label: 'Patrimônio', emptyText: '—' },
          { field: 'serialNumber', label: 'Nº de série', emptyText: '—' },
          {
            field: 'manufacturer',
            label: 'Fabricante / modelo',
            format: (_value, row) => {
              const equipment = row as Equipment;
              return [equipment.manufacturer, equipment.model].filter(Boolean).join(' · ') || '—';
            },
          },
          {
            field: 'siteId',
            label: 'Local',
            format: (value) => this.siteNames()[String(value)] ?? String(value ?? ''),
          },
          {
            field: 'status',
            label: 'Situação',
            type: 'badge',
            badgeContext: 'equipment',
            align: 'center',
          },
          {
            field: 'actions',
            label: 'Ações',
            type: 'actions',
            actionsInline: true,
            actions: [
              { id: 'view-qr', label: 'QR Code', icon: 'qr_code_2' },
              { id: 'view-history', label: 'Histórico', icon: 'history' },
              {
                id: 'edit-equipment',
                label: 'Editar',
                icon: 'edit',
                visible: () => this.canWrite('equipment'),
              },
              {
                id: 'deactivate-equipment',
                label: 'Inativar',
                icon: 'block',
                visible: (row) =>
                  this.canWrite('equipment') && (row as Equipment).status === 'ACTIVE',
              },
              {
                id: 'activate-equipment',
                label: 'Ativar',
                icon: 'check_circle',
                visible: (row) =>
                  this.canWrite('equipment') && (row as Equipment).status === 'INACTIVE',
              },
              {
                id: 'decommission-equipment',
                label: 'Descomissionar',
                icon: 'archive',
                danger: true,
                visible: (row) =>
                  this.canWrite('equipment') && (row as Equipment).status !== 'DECOMMISSIONED',
              },
            ],
          },
        ];
      case 'non-conformities':
        return [
          {
            field: 'severity',
            label: 'Criticidade',
            type: 'badge',
            badgeContext: 'severity',
            align: 'center',
          },
          { field: 'title', label: 'Item relacionado', sortable: true },
          { field: 'description', label: 'Descrição', emptyText: '—' },
          {
            field: 'id',
            label: 'Evidências',
            align: 'center',
            format: (_value, row) => {
              const count = this.evidenceCounts()[row.id];
              return count === undefined ? '…' : count === null ? '—' : String(count);
            },
          },
          {
            field: 'inspectionId',
            label: 'Inspeção',
            format: (value) => this.inspectionNames()[String(value)] ?? String(value ?? ''),
          },
          {
            field: 'createdAtDevice',
            label: 'Data',
            format: (value) => String(value ?? '').slice(0, 10) || '—',
            sortable: true,
          },
          {
            field: 'actions',
            label: 'Ações',
            type: 'actions',
            actionsInline: true,
            actions: [
              { id: 'view-non-conformity', label: 'Ver inspeção relacionada', icon: 'visibility' },
            ],
          },
        ];
    }
  });
  protected readonly activeFilters = computed<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (this.name().trim()) filters.push({ key: 'name', label: 'Nome', value: this.name().trim() });
    if (this.email().trim())
      filters.push({ key: 'email', label: 'E-mail', value: this.email().trim() });
    if (this.role()) filters.push({ key: 'role', label: 'Perfil', value: roleName(this.role()!) });
    if (this.status())
      filters.push({
        key: 'status',
        label: 'Situação',
        value: statusLabel(this.kind() === 'users' ? 'user' : 'equipment', this.status()),
      });
    if (this.severity())
      filters.push({
        key: 'severity',
        label: 'Criticidade',
        value: statusLabel('severity', this.severity()),
      });
    if (this.inspectionId()) {
      const selected = this.inspectionChoices().find((item) => item.id === this.inspectionId());
      filters.push({
        key: 'inspectionId',
        label: 'Inspeção',
        value: selected?.title || `Inspeção ${this.inspectionId()!.slice(0, 8)}`,
      });
    }
    if (this.contextId())
      filters.push({
        key: this.kind() === 'sites' ? 'clientId' : 'siteId',
        label: this.kind() === 'sites' ? 'Cliente' : 'Local',
        value: 'Selecionado',
      });
    if (this.qrSearchActive())
      filters.push({ key: 'qrCode', label: 'QR Code', value: this.qrCode().trim() });
    return filters;
  });
  protected readonly emptyMessage = computed(() =>
    this.activeFilters().length
      ? 'Nenhum registro corresponde aos filtros aplicados.'
      : this.config().empty,
  );

  constructor() {
    effect(() => {
      this.kind();
      this.contextId();
      untracked(() => {
        this.name.set('');
        this.email.set('');
        this.role.set(null);
        this.status.set(null);
        this.severity.set(null);
        this.inspectionId.set(null);
        this.qrCode.set('');
        this.qrSearchActive.set(false);
        this.params.set({ page: 0, size: 20 });
        if (this.kind() === 'non-conformities') this.loadInspectionChoices();
        this.load();
      });
    });
  }

  protected load(): void {
    this.qrSearchActive.set(false);
    const key = this.kind();
    const requestId = ++this.dataRequestId;
    this.loading.set(true);
    this.error.set(null);
    const paging = this.params();
    const request = (
      key === 'users'
        ? this.users.list({
            ...paging,
            name: this.name().trim() || undefined,
            email: this.email().trim() || undefined,
            role: this.role() ?? undefined,
            status: this.status() as UserFilters['status'] | undefined,
          } satisfies PageParams & UserFilters)
        : key === 'sites'
          ? this.contextId()
            ? this.sites.listByClient(this.contextId()!, {
                ...paging,
                name: this.name().trim() || undefined,
              })
            : this.sites.list({
                ...paging,
                name: this.name().trim() || undefined,
              } satisfies PageParams & SiteFilters)
          : key === 'equipment'
            ? this.contextId()
              ? this.equipment.listBySite(this.contextId()!, {
                  ...paging,
                  name: this.name().trim() || undefined,
                  status: this.status() as EquipmentFilters['status'] | undefined,
                })
              : this.equipment.list({
                  ...paging,
                  name: this.name().trim() || undefined,
                  status: this.status() as EquipmentFilters['status'] | undefined,
                } satisfies PageParams & EquipmentFilters)
            : this.nonConformities.list({
                ...paging,
                severity: this.severity() ?? undefined,
                inspectionId: this.inspectionId() ?? undefined,
              } satisfies PageParams & NonConformityFilters)
    ) as Observable<Page<CatalogRow>>;
    request
      .pipe(
        catchError((thrown: unknown) => {
          if (requestId === this.dataRequestId) this.error.set(isApiError(thrown) ? thrown : null);
          return of(emptyPage<CatalogRow>(this.params().size));
        }),
        finalize(() => {
          if (requestId === this.dataRequestId) this.loading.set(false);
        }),
      )
      .subscribe((page) => {
        if (requestId !== this.dataRequestId) return;
        this.data.set(page as Page<CatalogRow>);
        if (key === 'sites') {
          this.resolveClients(page.content as InspectionSite[]);
          this.resolveEquipmentCounts(page.content as InspectionSite[]);
        }
        if (key === 'equipment') this.resolveSites(page.content as Equipment[]);
        if (key === 'non-conformities') this.resolveInspections(page.content as NonConformity[]);
      });
  }

  private resolveClients(rows: InspectionSite[]): void {
    const requestId = ++this.clientNamesRequestId;
    const ids = [...new Set(rows.map((row) => row.clientId))];
    if (!ids.length) return;
    forkJoin(ids.map((id) => this.clients.get(id).pipe(catchError(() => of(null))))).subscribe(
      (clients) => {
        if (requestId !== this.clientNamesRequestId) return;
        this.clientNames.set(
          Object.fromEntries(
            clients
              .filter((client): client is Client => client !== null)
              .map((client) => [client.id, client.name]),
          ),
        );
        this.data.update((page) => ({ ...page }));
      },
    );
  }

  private resolveEquipmentCounts(rows: InspectionSite[]): void {
    const requestId = ++this.equipmentCountsRequestId;
    const ids = [...new Set(rows.map((site) => site.id))];
    this.equipmentCounts.set({});
    if (!ids.length) return;
    forkJoin(
      ids.map((id) =>
        this.equipment.listBySite(id, { page: 0, size: 1 }).pipe(catchError(() => of(null))),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pages) => {
        if (requestId !== this.equipmentCountsRequestId) return;
        this.equipmentCounts.set(
          Object.fromEntries(ids.map((id, index) => [id, pages[index]?.totalElements ?? null])),
        );
        this.data.update((page) => ({ ...page }));
      });
  }

  private resolveSites(rows: Equipment[]): void {
    const requestId = ++this.siteNamesRequestId;
    const ids = [...new Set(rows.map((row) => row.siteId))];
    if (!ids.length) return;
    forkJoin(ids.map((id) => this.sites.get(id).pipe(catchError(() => of(null))))).subscribe(
      (sites) => {
        if (requestId !== this.siteNamesRequestId) return;
        this.siteNames.set(
          Object.fromEntries(
            sites
              .filter((site): site is InspectionSite => site !== null)
              .map((site) => [site.id, site.name]),
          ),
        );
        this.data.update((page) => ({ ...page }));
      },
    );
  }

  private resolveInspections(rows: NonConformity[]): void {
    const requestId = ++this.inspectionDetailsRequestId;
    const ids = [...new Set(rows.map((row) => row.inspectionId))];
    this.inspectionNames.set({});
    this.evidenceCounts.set({});
    if (!ids.length) return;
    forkJoin(
      ids.map((id) =>
        forkJoin({
          inspection: this.inspections.get(id).pipe(catchError(() => of(null))),
          evidence: this.inspections.listEvidence(id).pipe(catchError(() => of(null))),
        }),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((related) => {
        if (requestId !== this.inspectionDetailsRequestId) return;
        this.inspectionNames.set(
          Object.fromEntries(
            related
              .map(({ inspection }) => inspection)
              .filter(
                (inspection): inspection is NonNullable<typeof inspection> => inspection !== null,
              )
              .map((inspection) => [inspection.id, inspection.title || inspection.id]),
          ),
        );
        const byInspection = new Map(ids.map((id, index) => [id, related[index].evidence]));
        this.evidenceCounts.set(
          Object.fromEntries(
            rows.map((row) => {
              const evidence = byInspection.get(row.inspectionId);
              return [
                row.id,
                evidence === null
                  ? null
                  : (evidence?.filter((item) => item.nonConformityId === row.id).length ?? 0),
              ];
            }),
          ),
        );
        this.data.update((page) => ({ ...page }));
      });
  }

  private loadInspectionChoices(): void {
    const requestId = ++this.inspectionChoicesRequestId;
    this.inspections
      .list({ page: 0, size: 100 })
      .pipe(
        catchError(() => of(emptyPage<Inspection>(100))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        if (requestId === this.inspectionChoicesRequestId) this.inspectionChoices.set(page.content);
      });
  }

  protected setName(value: string): void {
    this.name.set(value);
    this.refreshFirstPage();
  }
  protected setEmail(value: string): void {
    this.email.set(value);
    this.refreshFirstPage();
  }
  protected setRole(value: UserFilters['role'] | null): void {
    this.role.set(value);
    this.refreshFirstPage();
  }
  protected setStatus(value: UserStatusOrEquipmentStatus | null): void {
    this.status.set(value);
    this.refreshFirstPage();
  }
  protected setSeverity(value: NonConformityFilters['severity'] | null): void {
    this.severity.set(value);
    this.refreshFirstPage();
  }
  protected setInspectionId(value: NonConformityFilters['inspectionId'] | null): void {
    this.inspectionId.set(value);
    this.refreshFirstPage();
  }
  protected onPage(page: PageParams): void {
    this.params.update((p) => ({ ...p, ...page }));
    this.load();
  }
  protected onSort(sort: Sort | null): void {
    this.params.update((p) => ({ ...p, sort: sort ?? undefined }));
    this.load();
  }
  protected onFilter(filters: readonly ActiveFilter[]): void {
    if (!filters.some((filter) => filter.key === 'name')) this.name.set('');
    if (!filters.some((filter) => filter.key === 'email')) this.email.set('');
    if (!filters.some((filter) => filter.key === 'role')) this.role.set(null);
    if (!filters.some((filter) => filter.key === 'status')) this.status.set(null);
    if (!filters.some((filter) => filter.key === 'severity')) this.severity.set(null);
    if (!filters.some((filter) => filter.key === 'inspectionId')) this.inspectionId.set(null);
    if (!filters.some((filter) => filter.key === 'qrCode')) {
      this.qrSearchActive.set(false);
      this.qrCode.set('');
    }
    const contextKey = this.kind() === 'sites' ? 'clientId' : 'siteId';
    if (this.contextId() && !filters.some((filter) => filter.key === contextKey)) {
      void this.router.navigate([this.kind() === 'sites' ? '/sites' : '/equipment']);
      return;
    }
    this.refreshFirstPage();
  }

  protected canWrite(resource: 'users' | 'sites' | 'equipment'): boolean {
    return canWrite(resource, this.auth.role());
  }

  protected openUserForm(user?: User): void {
    if (!this.canWrite('users')) return;
    this.dialog
      .open(UserFormDialogComponent, {
        data: { user: user ?? null },
        width: '40rem',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved: boolean | undefined) => {
        if (saved) this.load();
      });
  }

  protected openSiteForm(site?: InspectionSite): void {
    if (!this.canWrite('sites')) return;
    this.dialog
      .open(SiteFormDialogComponent, {
        data: { site: site ?? null },
        width: '48rem',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved: boolean | undefined) => {
        if (saved) this.load();
      });
  }

  protected openEquipmentForm(equipment?: Equipment): void {
    if (!this.canWrite('equipment')) return;
    this.dialog
      .open(EquipmentFormDialogComponent, {
        data: { equipment: equipment ?? null },
        width: '48rem',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved: boolean | undefined) => {
        if (saved) this.load();
      });
  }

  protected lookupQr(): void {
    if (this.kind() !== 'equipment' || this.loading()) return;
    const code = this.qrCode().trim();
    if (!code) return;
    this.loading.set(true);
    this.error.set(null);
    this.equipment
      .getByQrCode(code)
      .pipe(
        catchError((thrown: unknown) => {
          this.qrSearchActive.set(true);
          this.error.set(isApiError(thrown) ? thrown : null);
          if (!isApiError(thrown))
            this.notifications.error('Não foi possível consultar o QR Code.');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((equipment) => {
        if (!equipment) return;
        this.qrSearchActive.set(true);
        this.data.set({ content: [equipment], totalElements: 1, totalPages: 1, page: 0, size: 1 });
        this.resolveSites([equipment]);
      });
  }

  protected retry(): void {
    if (this.kind() === 'equipment' && this.qrSearchActive()) this.lookupQr();
    else this.load();
  }

  protected onRowAction(event: RowActionEvent<CatalogRow>): void {
    if (this.kind() === 'users') {
      if (!this.canWrite('users')) return;
      const user = event.row as User;
      if (event.action === 'edit-user') this.openUserForm(user);
      else if (event.action === 'reset-user-password') this.confirmPasswordReset(user);
      else this.confirmUserStatus(user, event.action);
      return;
    }
    if (this.kind() === 'non-conformities') {
      this.openNonConformityDetail(event.row as NonConformity);
      return;
    }
    if (this.kind() === 'sites') {
      const site = event.row as InspectionSite;
      if (event.action === 'view-equipment') {
        void this.router.navigate(['/sites', site.id, 'equipment']);
        return;
      }
      if (!this.canWrite('sites')) return;
      if (event.action === 'edit-site') {
        this.openSiteForm(site);
        return;
      }
      this.confirmSiteStatus(site, event.action);
      return;
    }
    if (this.kind() !== 'equipment') return;
    const equipment = event.row as Equipment;
    if (event.action === 'view-qr') {
      this.dialog.open(EquipmentQrDialogComponent, {
        data: { equipment },
        width: '26rem',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      });
      return;
    }
    if (event.action === 'view-history') {
      this.dialog.open(EquipmentHistoryDialogComponent, {
        data: { equipment },
        width: '56rem',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      });
      return;
    }
    if (!this.canWrite('equipment')) return;
    if (event.action === 'edit-equipment') {
      this.openEquipmentForm(equipment);
      return;
    }

    this.confirmEquipmentStatus(equipment, event.action);
  }

  private openNonConformityDetail(nonConformity: NonConformity): void {
    this.dialog.open(NonConformityDetailDialogComponent, {
      data: { nonConformity },
      width: '44rem',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
  }

  private confirmUserStatus(user: User, action: string): void {
    const status =
      action === 'activate-user'
        ? 'ACTIVE'
        : action === 'deactivate-user'
          ? 'INACTIVE'
          : action === 'block-user'
            ? 'BLOCKED'
            : null;
    if (!status || status === user.status) return;
    const label = status === 'ACTIVE' ? 'ativar' : status === 'INACTIVE' ? 'inativar' : 'bloquear';
    this.confirmation
      .open({
        title: `${label[0].toUpperCase()}${label.slice(1)} usuário?`,
        message:
          status === 'ACTIVE'
            ? `${user.name} poderá iniciar novas sessões novamente.`
            : `${user.name} não poderá iniciar novas sessões. As sessões ativas serão invalidadas.`,
        confirmLabel: `Sim, ${label}`,
        variant: status === 'ACTIVE' ? 'primary' : 'warning',
      })
      .pipe(
        filter((result) => result.confirmed),
        switchMap(() => this.users.setStatus(user.id, status)),
        catchError((thrown: unknown) => {
          this.notifications.error(
            isApiError(thrown) ? thrown.userMessage : 'Não foi possível atualizar o usuário.',
          );
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((updated) => {
        if (!updated) return;
        this.notifications.success(
          `Usuário ${status === 'ACTIVE' ? 'ativado' : status === 'INACTIVE' ? 'inativado' : 'bloqueado'}.`,
        );
        this.load();
      });
  }

  private confirmPasswordReset(user: User): void {
    this.confirmation
      .open({
        title: 'Redefinir senha?',
        message: `Solicitar redefinição de senha para ${user.name}?`,
        confirmLabel: 'Solicitar redefinição',
        variant: 'warning',
      })
      .pipe(
        filter((result) => result.confirmed),
        switchMap(() => this.users.resetPassword(user.id)),
        catchError((thrown: unknown) => {
          this.notifications.error(
            isApiError(thrown)
              ? thrown.userMessage
              : 'Não foi possível solicitar a redefinição de senha.',
          );
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (response) this.notifications.success(response.message);
      });
  }

  private confirmSiteStatus(site: InspectionSite, action: string): void {
    if (action !== 'deactivate-site' && action !== 'activate-site') return;
    const status = action === 'deactivate-site' ? 'INACTIVE' : 'ACTIVE';
    const inactive = status === 'INACTIVE';
    this.confirmation
      .open({
        title: inactive ? 'Inativar local?' : 'Reativar local?',
        message: inactive
          ? `${site.name} não poderá ser selecionado em novas inspeções. O histórico será preservado.`
          : `${site.name} poderá voltar a ser selecionado em novas inspeções.`,
        confirmLabel: inactive ? 'Sim, inativar' : 'Sim, reativar',
        variant: inactive ? 'warning' : 'primary',
      })
      .pipe(
        filter((result) => result.confirmed),
        switchMap(() => this.sites.setStatus(site.id, status)),
        catchError((thrown: unknown) => {
          this.notifications.error(
            isApiError(thrown) ? thrown.userMessage : 'Não foi possível atualizar o local.',
          );
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((updated) => {
        if (!updated) return;
        this.notifications.success(inactive ? 'Local inativado.' : 'Local reativado.');
        this.load();
      });
  }

  private confirmEquipmentStatus(equipment: Equipment, action: string): void {
    if (!['deactivate-equipment', 'activate-equipment', 'decommission-equipment'].includes(action))
      return;
    const status =
      action === 'activate-equipment'
        ? 'ACTIVE'
        : action === 'decommission-equipment'
          ? 'DECOMMISSIONED'
          : 'INACTIVE';
    const title =
      status === 'DECOMMISSIONED'
        ? 'Descomissionar equipamento?'
        : status === 'INACTIVE'
          ? 'Inativar equipamento?'
          : 'Reativar equipamento?';
    const message =
      status === 'ACTIVE'
        ? `${equipment.name} poderá voltar a ser selecionado em novas inspeções.`
        : `${equipment.name} não poderá ser selecionado em novas inspeções. O histórico será preservado.`;
    this.confirmation
      .open({
        title,
        message,
        confirmLabel:
          status === 'ACTIVE'
            ? 'Sim, reativar'
            : status === 'INACTIVE'
              ? 'Sim, inativar'
              : 'Sim, descomissionar',
        variant: status === 'ACTIVE' ? 'primary' : 'warning',
      })
      .pipe(
        filter((result) => result.confirmed),
        switchMap(() => this.equipment.setStatus(equipment.id, status)),
        catchError((thrown: unknown) => {
          this.notifications.error(
            isApiError(thrown) ? thrown.userMessage : 'Não foi possível atualizar o equipamento.',
          );
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((updated) => {
        if (!updated) return;
        this.notifications.success(
          status === 'ACTIVE'
            ? 'Equipamento reativado.'
            : status === 'INACTIVE'
              ? 'Equipamento inativado.'
              : 'Equipamento descomissionado.',
        );
        this.qrSearchActive.set(false);
        this.load();
      });
  }
  private refreshFirstPage(): void {
    this.params.update((p) => ({ ...p, page: 0 }));
    this.load();
  }
}

type UserStatusOrEquipmentStatus = UserFilters['status'] | EquipmentFilters['status'];

function roleName(value: string): string {
  return (
    (
      {
        ADMIN: 'Administrador',
        SUPERVISOR: 'Supervisor',
        TECHNICIAN: 'Técnico',
        CLIENT_VIEWER: 'Cliente',
      } as Record<string, string>
    )[value] ?? value
  );
}
