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
  InspectionSite,
  NonConformity,
  User,
} from '../../core/models/domain';
import { emptyPage, type Page, type PageParams, type Sort } from '../../core/models/page.model';
import {
  ClientsService,
  EquipmentService,
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
      </app-page-header>
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
        (retry)="load()"
      />
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
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmation = inject(ConfirmDialogService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly users = inject(UsersService);
  private readonly sites = inject(SitesService);
  private readonly equipment = inject(EquipmentService);
  private readonly nonConformities = inject(NonConformitiesService);
  private readonly clients = inject(ClientsService);

  protected readonly kind = computed(() => {
    const key = this.routeData()['catalog'] as CatalogKey | undefined;
    return key && key in PAGE_CONFIG ? key : 'users';
  });
  protected readonly config = computed(() => PAGE_CONFIG[this.kind()]);
  private readonly contextId = computed(() => {
    const params = this.queryParams();
    return this.kind() === 'sites'
      ? params.get('clientId')
      : this.kind() === 'equipment'
        ? params.get('siteId')
        : null;
  });
  protected readonly statusChoices = computed(() =>
    statusOptions(this.kind() === 'users' ? 'user' : 'equipment'),
  );
  protected readonly severityChoices = statusOptions('severity');
  protected readonly data = signal<Page<CatalogRow>>(emptyPage());
  private readonly clientNames = signal<Record<string, string>>({});
  private readonly siteNames = signal<Record<string, string>>({});
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly role = signal<UserFilters['role'] | null>(null);
  protected readonly status = signal<UserFilters['status'] | EquipmentFilters['status'] | null>(
    null,
  );
  protected readonly severity = signal<NonConformityFilters['severity'] | null>(null);
  private readonly params = signal<PageParams>({ page: 0, size: 20 });
  protected readonly sort = computed<Sort | null>(() => {
    const value = this.params().sort;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Sort) : null;
  });
  protected readonly columns = computed<readonly TableColumn<CatalogRow>[]>(() => {
    switch (this.kind()) {
      case 'users':
        return [
          { field: 'name', label: 'Nome', sortable: true },
          { field: 'email', label: 'E-mail', sortable: true },
          {
            field: 'role',
            label: 'Perfil',
            sortable: true,
            format: (value) => roleName(String(value)),
          },
          {
            field: 'status',
            label: 'Situação',
            type: 'badge',
            badgeContext: 'user',
            align: 'center',
          },
          { field: 'createdAt', label: 'Criado em', type: 'date', sortable: true },
        ];
      case 'sites':
        return [
          { field: 'name', label: 'Local', sortable: true },
          {
            field: 'clientId',
            label: 'Cliente',
            format: (value) => this.clientNames()[String(value)] ?? String(value ?? ''),
          },
          { field: 'city', label: 'Cidade', emptyText: '—' },
          { field: 'state', label: 'UF', emptyText: '—', width: '5rem' },
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
              { id: 'view-equipment', label: 'Ver equipamentos', icon: 'precision_manufacturing' },
            ],
          },
        ];
      case 'equipment':
        return [
          { field: 'name', label: 'Equipamento', sortable: true },
          { field: 'assetNumber', label: 'Patrimônio', emptyText: '—' },
          { field: 'serialNumber', label: 'Nº de série', emptyText: '—' },
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
        ];
      case 'non-conformities':
        return [
          { field: 'title', label: 'Não conformidade', sortable: true },
          { field: 'inspectionId', label: 'Inspeção' },
          {
            field: 'severity',
            label: 'Criticidade',
            type: 'badge',
            badgeContext: 'severity',
            align: 'center',
          },
          {
            field: 'status',
            label: 'Situação',
            type: 'badge',
            badgeContext: 'nonConformity',
            align: 'center',
          },
          { field: 'createdAt', label: 'Registrada em', type: 'date', sortable: true },
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
    if (this.contextId())
      filters.push({
        key: this.kind() === 'sites' ? 'clientId' : 'siteId',
        label: this.kind() === 'sites' ? 'Cliente' : 'Local',
        value: 'Selecionado',
      });
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
        this.params.set({ page: 0, size: 20 });
        this.load();
      });
    });
  }

  protected load(): void {
    const key = this.kind();
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
          ? this.sites.list({
              ...paging,
              name: this.name().trim() || undefined,
              clientId: this.contextId() ?? undefined,
            } satisfies PageParams & SiteFilters)
          : key === 'equipment'
            ? this.equipment.list({
                ...paging,
                name: this.name().trim() || undefined,
                siteId: this.contextId() ?? undefined,
                status: this.status() as EquipmentFilters['status'] | undefined,
              } satisfies PageParams & EquipmentFilters)
            : this.nonConformities.list({
                ...paging,
                severity: this.severity() ?? undefined,
              } satisfies PageParams & NonConformityFilters)
    ) as Observable<Page<CatalogRow>>;
    request
      .pipe(
        catchError((thrown: unknown) => {
          this.error.set(isApiError(thrown) ? thrown : null);
          return of(emptyPage<CatalogRow>(this.params().size));
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((page) => {
        this.data.set(page as Page<CatalogRow>);
        if (key === 'sites') this.resolveClients(page.content as InspectionSite[]);
        if (key === 'equipment') this.resolveSites(page.content as Equipment[]);
      });
  }

  private resolveClients(rows: InspectionSite[]): void {
    const ids = [...new Set(rows.map((row) => row.clientId))];
    if (!ids.length) return;
    forkJoin(ids.map((id) => this.clients.get(id).pipe(catchError(() => of(null))))).subscribe(
      (clients) => {
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

  private resolveSites(rows: Equipment[]): void {
    const ids = [...new Set(rows.map((row) => row.siteId))];
    if (!ids.length) return;
    forkJoin(ids.map((id) => this.sites.get(id).pipe(catchError(() => of(null))))).subscribe(
      (sites) => {
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
    const contextKey = this.kind() === 'sites' ? 'clientId' : 'siteId';
    if (this.contextId() && !filters.some((filter) => filter.key === contextKey)) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { clientId: null, siteId: null },
        queryParamsHandling: 'merge',
      });
      return;
    }
    this.refreshFirstPage();
  }

  protected canWrite(resource: 'sites' | 'equipment'): boolean {
    return canWrite(resource, this.auth.role());
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

  protected onRowAction(event: RowActionEvent<CatalogRow>): void {
    if (this.kind() !== 'sites') return;
    const site = event.row as InspectionSite;
    if (event.action === 'view-equipment') {
      void this.router.navigate(['/equipment'], { queryParams: { siteId: site.id } });
      return;
    }
    if (!this.canWrite('sites')) return;
    if (event.action === 'edit-site') {
      this.openSiteForm(site);
      return;
    }

    const status = event.action === 'deactivate-site' ? 'INACTIVE' : 'ACTIVE';
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
