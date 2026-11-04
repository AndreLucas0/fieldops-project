import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnChanges,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isApiError, type ApiError } from '../../core';
import type { InspectionTemplateVersionDetail } from '../../core/models/domain';
import { emptyPage, type Page, type PageParams } from '../../core/models/page.model';
import { TemplatesService } from '../../core/services/resources';
import { DataTableComponent, PageHeaderComponent, type TableColumn } from '../../shared/components';

@Component({
  selector: 'app-template-versions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, DataTableComponent, PageHeaderComponent],
  template: `<section class="page">
    <app-page-header
      [title]="'Versões — ' + title()"
      subtitle="Histórico imutável dos checklists publicados."
      [breadcrumbs]="[{ label: 'Modelos', link: '/inspection-templates' }, { label: 'Versões' }]"
    >
      <a actions matButton [routerLink]="['/inspection-templates', templateId(), 'preview']"
        >Ver prévia atual</a
      >
    </app-page-header>
    @if (message()) {
      <p role="alert">
        {{ message() }} <button matButton (click)="load()">Tentar novamente</button>
      </p>
    }
    <div class="catalog-card">
      <app-data-table
        [columns]="columns"
        [data]="data()"
        [loading]="loading()"
        [error]="error()"
        ariaLabel="Versões publicadas do modelo"
        emptyTitle="Nenhuma versão publicada"
        emptyMessage="Monte o rascunho e confira a prévia antes de publicar."
        (pageChange)="onPage($event)"
        (retry)="load()"
        (rowAction)="openVersion($event.row.id)"
      />
    </div>
  </section>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    p[role='alert'] {
      color: var(--mat-sys-error);
    }
  `,
})
export class TemplateVersionsComponent implements OnChanges {
  readonly templateId = input.required<string>();
  private readonly service = inject(TemplatesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private params: PageParams = { page: 0, size: 20, sort: 'versionNumber,desc' };
  readonly title = signal('Modelo');
  readonly loading = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly message = signal<string | null>(null);
  readonly data = signal<Page<InspectionTemplateVersionDetail>>(emptyPage());
  readonly columns: readonly TableColumn<InspectionTemplateVersionDetail>[] = [
    { field: 'versionNumber', label: 'Versão', format: (value) => 'v' + value },
    { field: 'titleSnapshot', label: 'Título publicado' },
    { field: 'publishedBy', label: 'Publicado por', monospace: true },
    { field: 'publishedAt', label: 'Publicado em', type: 'date' },
    {
      field: 'activeForNewInspections',
      label: 'Novas inspeções',
      format: (value) => (value ? 'Ativa' : 'Histórica'),
    },
    {
      field: 'actions',
      label: 'Ações',
      type: 'actions',
      actionsInline: true,
      actions: [{ id: 'preview', label: 'Ver versão', icon: 'visibility' }],
    },
  ];
  ngOnChanges(): void {
    this.params = { ...this.params, page: 0 };
    this.load();
  }
  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.message.set(null);
    this.request = forkJoin([
      this.service.get(this.templateId()),
      this.service.listVersions(this.templateId(), { ...this.params }),
    ])
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ([template, page]) => {
          this.title.set(template.title);
          this.data.set(page);
        },
        error: (error: unknown) => {
          this.error.set(isApiError(error) ? error : null);
          this.message.set(
            isApiError(error) ? error.userMessage : 'Não foi possível carregar as versões.',
          );
          this.data.set(emptyPage());
        },
      });
  }
  onPage(params: PageParams): void {
    this.params = { ...this.params, ...params };
    this.load();
  }
  openVersion(versionId: string): void {
    void this.router.navigate(['/inspection-templates', this.templateId(), 'preview'], {
      queryParams: { versionId },
    });
  }
}
