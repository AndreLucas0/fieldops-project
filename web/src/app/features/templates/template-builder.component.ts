import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { catchError, concatMap, finalize, of } from 'rxjs';

import { AuthStore, canWrite, isApiError, type ApiError } from '../../core';
import type {
  InspectionTemplate,
  TemplateItem,
  TemplateSectionDetail,
} from '../../core/models/domain';
import { TemplatesService } from '../../core/services/resources';
import { NotificationService } from '../../core/notifications/notification.service';
import {
  EmptyStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  StatusBadgeComponent,
} from '../../shared/components';
import {
  RESPONSE_TYPE_LABELS,
  TemplateItemFormDialogService,
} from './template-item-form-dialog.component';
import { TemplateSectionFormDialogService } from './template-section-form-dialog.component';

/**
 * FE-W15 — Construtor de modelo (TS-10-10).
 *
 * Rota `/inspection-templates/:templateId/edit` (`docs/telas-frontend.md`
 * §3.9). Opera sobre a versão-rascunho do modelo (RN-018/019): só modelos
 * `DRAFT` podem ser editados aqui, condição refletida em `canEditDraft()`
 * tanto na leitura (banner explicando o motivo) quanto no bloqueio de ações.
 *
 * Os formulários de seção/item (TS-10-11) vivem em diálogos próprios —
 * `TemplateSectionFormDialogService` e `TemplateItemFormDialogService` — para
 * poderem ser reabertos tanto na criação quanto na edição.
 */
@Component({
  selector: 'app-template-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    EmptyStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  template: `
    
<div class="page">
 
<app-page-header
  [title]="pageTitle()"
  subtitle="Monte as seções e os itens do checklist."
  [breadcrumbs]="[
    { label: 'Modelos de inspeção', link: '/inspection-templates' },
    { label: pageTitle() },
  ]"
>
  @if (!isCreating()) {
    <a
      actions
      matButton
      [routerLink]="['/inspection-templates', templateId(), 'preview']"
    >
      <mat-icon>visibility</mat-icon>
      Ver prévia
    </a>
  }
</app-page-header>


  @if (loading()) {
    <app-loading-state variant="form" [rows]="4" label="Carregando modelo…" />
  } @else if (error(); as apiError) {
    <div class="error" role="alert">
      <mat-icon aria-hidden="true">error_outline</mat-icon>
      <p>{{ apiError.userMessage }}</p>
      <button matButton="filled" type="button" (click)="load()">
        <mat-icon>refresh</mat-icon>
        Tentar novamente
      </button>
    </div>
  } @else if (template(); as tpl) {
    <app-status-badge class="status" [value]="tpl.status" context="template" />

    @if (!canEditDraft()) {
      <div class="notice" role="status">
        <mat-icon aria-hidden="true">info</mat-icon>
        <p>
          Este modelo não está em rascunho — modelos
          {{ tpl.status === 'ACTIVE' ? 'ativos' : 'inativos' }}
          não podem ser editados aqui (RN-018). Consulte o histórico de versões para ver o
          conteúdo publicado.
        </p>
      </div>
    }

    <mat-card class="general">
      <mat-card-content class="general__fields">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Título</mat-label>
          <input
            matInput
            [disabled]="!canEditDraft()"
            [ngModel]="generalTitle()"
            (ngModelChange)="generalTitle.set($event)"
          />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Categoria</mat-label>
          <input
            matInput
            [disabled]="!canEditDraft()"
            [ngModel]="generalCategory()"
            (ngModelChange)="generalCategory.set($event)"
          />
        </mat-form-field>

        <mat-form-field
          appearance="outline"
          subscriptSizing="dynamic"
          class="general__description"
        >
          <mat-label>Descrição</mat-label>
          <textarea
            matInput
            rows="2"
            [disabled]="!canEditDraft()"
            [ngModel]="generalDescription()"
            (ngModelChange)="generalDescription.set($event)"
          ></textarea>
        </mat-form-field>
      </mat-card-content>

      @if (canEditDraft()) {
        <mat-card-actions align="end">
          <button
            matButton
            type="button"
            [disabled]="saving() || !generalChanged()"
            (click)="saveGeneral()"
          >
            Salvar dados gerais
          </button>
        </mat-card-actions>
      }
    </mat-card>

    @if (sections().length === 0) {
      <app-empty-state
        icon="view_list"
        title="Nenhuma seção ainda"
        message="Organize as perguntas em seções — por exemplo, por área ou etapa da inspeção."
        [actionLabel]="canEditDraft() ? 'Nova seção' : null"
        (action)="addSection()"
      />
    } @else {
      <div class="sections">
        @for (section of sections(); track section.id; let first = $first; let last = $last) {
          <mat-card class="section">
            <mat-card-header class="section__header">
              <mat-card-title>{{ section.title }}</mat-card-title>

              @if (section.description) {
                <mat-card-subtitle>{{ section.description }}</mat-card-subtitle>
              }

              @if (canEditDraft()) {
                <div class="section__actions">
                  <button
                    matIconButton
                    type="button"
                    aria-label="Mover seção para cima"
                    [disabled]="first || saving()"
                    (click)="moveSection(section, -1)"
                  >
                    <mat-icon>arrow_upward</mat-icon>
                  </button>

                  <button
                    matIconButton
                    type="button"
                    aria-label="Mover seção para baixo"
                    [disabled]="last || saving()"
                    (click)="moveSection(section, 1)"
                  >
                    <mat-icon>arrow_downward</mat-icon>
                  </button>

                  <button
                    matIconButton
                    type="button"
                    aria-label="Editar seção"
                    (click)="editSection(section)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                </div>
              }
            </mat-card-header>

            <mat-card-content>
              @if ((section.items ?? []).length === 0) {
                <p class="section__empty">Nenhum item nesta seção ainda.</p>
              } @else {
                <ul class="items">
                  @for (
                    item of section.items ?? [];
                    track item.id;
                    let firstItem = $first;
                    let lastItem = $last
                  ) {
                    <li class="item">
                      <div class="item__text">
                        <span class="item__title">{{ item.title }}</span>

                        <span class="item__meta">
                          {{ responseTypeLabel(item) }}

                          @if (item.required) {
                            · Obrigatório
                          }
                        </span>
                      </div>

                      @if (canEditDraft()) {
                        <div class="item__actions">
                          <button
                            matIconButton
                            type="button"
                            aria-label="Mover item para cima"
                            [disabled]="firstItem || saving()"
                            (click)="moveItem(section, item, -1)"
                          >
                            <mat-icon>arrow_upward</mat-icon>
                          </button>

                          <button
                            matIconButton
                            type="button"
                            aria-label="Mover item para baixo"
                            [disabled]="lastItem || saving()"
                            (click)="moveItem(section, item, 1)"
                          >
                            <mat-icon>arrow_downward</mat-icon>
                          </button>

                          <button
                            matIconButton
                            type="button"
                            aria-label="Editar item"
                            (click)="editItem(section, item)"
                          >
                            <mat-icon>edit</mat-icon>
                          </button>
                        </div>
                      }
                    </li>
                  }
                </ul>
              }

              @if (canEditDraft()) {
                <button matButton type="button" (click)="addItem(section)">
                  <mat-icon>add</mat-icon>
                  Novo item
                </button>
              }
            </mat-card-content>
          </mat-card>
        }
      </div>

      @if (canEditDraft()) {
        <button
          matButton="outlined"
          type="button"
          class="add-section"
          (click)="addSection()"
        >
          <mat-icon>add</mat-icon>
          Nova seção
        </button>
      }
    }
  }
</div>

  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 52rem;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .error,
    .notice {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 0.5rem;
    }

    .error {
      flex-direction: column;
      color: var(--mat-sys-error);
      border: 1px solid var(--mat-sys-error);
    }

    .notice {
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
    }

    .general__fields {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .general__fields mat-form-field {
      flex: 1 1 14rem;
    }

    .general__description {
      flex-basis: 100%;
    }

    .sections {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .section__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .section__actions,
    .item__actions {
      display: flex;
      gap: 0.125rem;
      flex-shrink: 0;
    }

    .section__empty {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.875rem;
    }

    .items {
      list-style: none;
      margin: 0 0 0.75rem;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .item:last-child {
      border-bottom: none;
    }

    .item__text {
      display: flex;
      flex-direction: column;
    }

    .item__title {
      font-size: 0.9375rem;
    }

    .item__meta {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .add-section {
      align-self: flex-start;
    }
  `,
})
export class TemplateBuilderComponent implements OnInit {
  private readonly templates = inject(TemplatesService);
  private readonly auth = inject(AuthStore);
  private readonly notifications = inject(NotificationService);
  private readonly sectionDialog = inject(TemplateSectionFormDialogService);
  private readonly itemDialog = inject(TemplateItemFormDialogService);

  readonly templateId = input<string | null>(null);

  protected readonly isCreating = computed(() => !this.templateId());

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly template = signal<InspectionTemplate | null>(null);
  protected readonly sections = signal<TemplateSectionDetail[]>([]);

  protected readonly generalTitle = signal('');
  protected readonly generalCategory = signal('');
  protected readonly generalDescription = signal('');

  protected readonly pageTitle = computed(() =>
    this.isCreating()
      ? 'Novo modelo'
      : this.template()?.title ?? 'Modelo de inspeção',
  );

  protected readonly canEditDraft = computed(
    () => this.template()?.status === 'DRAFT' && canWrite('inspection-templates', this.auth.role()),
  );

  protected readonly generalChanged = computed(() => {
    const tpl = this.template();
    if (!tpl) return false;
    return (
      this.generalTitle() !== tpl.title ||
      this.generalCategory() !== tpl.category ||
      this.generalDescription() !== (tpl.description ?? '')
    );
  });

  ngOnInit(): void {
    if (this.isCreating()) {
      this.startNewTemplate();
      return;
    }

    this.load();
  }

  protected load(): void {
    const id = this.templateId();

    if (!id) {
      this.startNewTemplate();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    forkJoin([this.templates.get(id), this.templates.listDraftSections(id)])
      .pipe(
        catchError((thrown: unknown) => {
          this.error.set(isApiError(thrown) ? thrown : null);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((result) => {
        if (!result) return;
        const [tpl, sections] = result;
        this.applyTemplate(tpl);
        this.sections.set(this.sortTree(sections));
      });
  }

  private applyTemplate(tpl: InspectionTemplate): void {
    this.template.set(tpl);
    this.generalTitle.set(tpl.title);
    this.generalCategory.set(tpl.category);
    this.generalDescription.set(tpl.description ?? '');
  }

  private sortTree(sections: readonly TemplateSectionDetail[]): TemplateSectionDetail[] {
    return [...sections]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((section) => ({
        ...section,
        items: [...(section.items ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
      }));
  }

  private startNewTemplate(): void {
    this.template.set({
      id: '',
      title: '',
      description: null,
      category: '',
      status: 'DRAFT',
      currentVersion: null,
      createdBy: '',
      createdAt: '',
      updatedAt: '',
      version: 1,
    });

    this.generalTitle.set('');
    this.generalCategory.set('');
    this.generalDescription.set('');
    this.sections.set([]);
  }

  /** Recarrega só as seções, sem o esqueleto de página inteira. */
  private reloadSections(): void {
    const templateId = this.templateId();
    if (!templateId) return;

    this.templates.listDraftSections(templateId).subscribe((sections) => {
      this.sections.set(this.sortTree(sections));
    });
  }

  protected responseTypeLabel(item: TemplateItem): string {
    return RESPONSE_TYPE_LABELS[item.responseType];
  }

  protected saveGeneral(): void {
    if (this.saving()) return;

    const input = {
      title: this.generalTitle().trim(),
      category: this.generalCategory().trim(),
      description: this.generalDescription().trim() || null,
    };

    if (!input.title || !input.category) {
      this.notifications.error('Preencha o título e a categoria.');
      return;
    }

    const tpl = this.template();

    // O modelo provisório possui ID vazio.
    // Só usamos update quando ele já foi criado.
    const isNew = !tpl?.id;

    this.saving.set(true);

    const request = isNew
      ? this.templates.create(input)
      : this.templates.update(tpl.id, input);

    request
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.applyTemplate(saved);

          this.notifications.success(
            isNew
              ? 'Modelo criado com sucesso.'
              : 'Dados gerais atualizados.',
          );
        },
        error: (error: unknown) => {
          this.notifications.error(
            isApiError(error)
              ? error.userMessage
              : 'Não foi possível salvar o modelo.',
          );
        },
      });
  }

  protected addSection(): void {
    this.sectionDialog.open({}).subscribe((result) => {
      if (!result) return;

      const nextOrder = this.sections().length + 1;
      const templateId = this.templateId();

      // Modelo novo: mantém a seção na tela, sem chamar a API.
      if (!templateId) {
        const newSection: TemplateSectionDetail = {
          id: `local-${crypto.randomUUID()}`,
          templateVersionId: '',
          title: result.title,
          description: result.description,
          displayOrder: nextOrder,
          createdAt: new Date().toISOString(),
          items: [],
        };

        this.sections.update((current) => [...current, newSection]);
        return;
      }

      // Modelo existente: mantém o comportamento atual.
      this.saving.set(true);

      this.templates
        .createSection(templateId, {
          ...result,
          displayOrder: nextOrder,
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe(() => {
          this.reloadSections();
          this.notifications.success('Seção criada.');
        });
    });
  }


  protected editSection(section: TemplateSectionDetail): void {
    this.sectionDialog.open({ section }).subscribe((result) => {
      if (!result) return;

      const templateId = this.templateId();

      // Modelo novo: atualiza a seção localmente.
      if (!templateId) {
        this.sections.update((current) =>
          current.map((currentSection) =>
            currentSection.id === section.id
              ? {
                ...currentSection,
                title: result.title,
                description: result.description,
              }
              : currentSection,
          ),
        );

        return;
      }

      // Modelo existente: mantém a atualização pela API.
      this.saving.set(true);

      this.templates
        .updateSection(templateId, section.id, result)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe(() => {
          this.reloadSections();
          this.notifications.success('Seção atualizada.');
        });
    });
  }

  protected moveSection(section: TemplateSectionDetail, direction: -1 | 1): void {
    const templateId = this.templateId();
    if (!templateId) return;

    const ordered = this.sections();
    const index = ordered.findIndex((candidate) => candidate.id === section.id);
    const neighbor = ordered[index + direction];

    if (!neighbor || this.saving()) return;

    const originalOrder = section.displayOrder;
    const targetOrder = neighbor.displayOrder;
    const first = { title: section.title, description: section.description };
    const second = { title: neighbor.title, description: neighbor.description };
    const temporaryOrder = Math.max(...ordered.map((entry) => entry.displayOrder)) + 1;
    this.saving.set(true);

    forkJoin([
      this.templates.updateSection(templateId, section.id, {
        displayOrder: neighbor.displayOrder,
      }),
      this.templates.updateSection(templateId, neighbor.id, {
        displayOrder: section.displayOrder,
      }),
    ])
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => this.reloadSections());
  }


  protected addItem(section: TemplateSectionDetail): void {
    this.itemDialog.open({}).subscribe((result) => {
      if (!result) return;

      const nextOrder = (section.items ?? []).length + 1;
      const templateId = this.templateId();

      // Modelo novo: mantém o item localmente.
      if (!templateId) {
        const newItem: TemplateItem = {
          id: `local-${crypto.randomUUID()}`,
          sectionId: section.id,
          ...result,
          displayOrder: nextOrder,
          createdAt: new Date().toISOString(),
        };

        this.sections.update((current) =>
          current.map((currentSection) =>
            currentSection.id === section.id
              ? {
                ...currentSection,
                items: [...(currentSection.items ?? []), newItem],
              }
              : currentSection,
          ),
        );

        return;
      }

      // Modelo existente: mantém o comportamento atual.
      this.saving.set(true);

      this.templates
        .createItem(templateId, section.id, {
          ...result,
          displayOrder: nextOrder,
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe(() => {
          this.reloadSections();
          this.notifications.success('Item criado.');
        });
    });
  }


  protected editItem(section: TemplateSectionDetail, item: TemplateItem): void {
    this.itemDialog.open({ item }).subscribe((result) => {
      if (!result) return;

      const templateId = this.templateId();

      // Modelo novo: atualiza o item localmente.
      if (!templateId) {
        this.sections.update((current) =>
          current.map((currentSection) =>
            currentSection.id === section.id
              ? {
                ...currentSection,
                items: (currentSection.items ?? []).map((currentItem) =>
                  currentItem.id === item.id
                    ? {
                      ...currentItem,
                      ...result,
                    }
                    : currentItem,
                ),
              }
              : currentSection,
          ),
        );

        return;
      }

      // Modelo existente: mantém a atualização pela API.
      this.saving.set(true);

      this.templates
        .updateItem(templateId, item.id, result)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe(() => {
          this.reloadSections();
          this.notifications.success('Item atualizado.');
        });
    });
  }

  

protected moveItem(
  section: TemplateSectionDetail,
  item: TemplateItem,
  direction: -1 | 1,
): void {
  const templateId = this.templateId();
  if (!templateId) return;

  const items = section.items ?? [];
  const index = items.findIndex((candidate) => candidate.id === item.id);
  const neighbor = items[index + direction];

  if (!neighbor || this.saving() || !this.canEditDraft()) return;

  const temporaryOrder =
    Math.max(...items.map((entry) => entry.displayOrder)) + 1;

  const payload = (target: TemplateItem, displayOrder: number) => ({
    title: target.title,
    description: target.description,
    responseType: target.responseType,
    required: target.required,
    observationRequiredOnFailure: target.observationRequiredOnFailure,
    evidenceRequiredOnFailure: target.evidenceRequiredOnFailure,
    optionsJson: target.optionsJson,
    displayOrder,
  });

  this.saving.set(true);

  this.templates
    .updateItem(templateId, item.id, payload(item, temporaryOrder))
    .pipe(
      concatMap(() =>
        this.templates.updateItem(
          templateId,
          neighbor.id,
          payload(neighbor, item.displayOrder),
        ),
      ),
      concatMap(() =>
        this.templates.updateItem(
          templateId,
          item.id,
          payload(item, neighbor.displayOrder),
        ),
      ),
      finalize(() => this.saving.set(false)),
    )
    .subscribe({
      next: () => this.reloadSections(),
      error: () => {
        this.notifications.error('Não foi possível reordenar os itens.');
      },
    });
}

}
