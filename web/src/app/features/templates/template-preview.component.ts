import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
    ChangeDetectionStrategy,
    Component,
  DestroyRef,
    OnInit,
    computed,
    inject,
    input,
    signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthStore, canWrite, isApiError, type ApiError } from '../../core';
import type {
    InspectionTemplate,
    TemplateItem,
    TemplateSectionDetail,
} from '../../core/models/domain';
import { TemplatesService } from '../../core/services/resources';
import {
    EmptyStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
} from '../../shared/components';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RESPONSE_TYPE_LABELS } from './template-item-form-dialog.component';

@Component({
    selector: 'app-template-preview',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        MatButtonModule,
        MatIconModule,
        PageHeaderComponent,
        StatusBadgeComponent,
        LoadingStateComponent,
        EmptyStateComponent,
    ],
    template: `
    <div class="page">
      <app-page-header
        [title]="template()?.title ?? 'Prévia do modelo'"
        subtitle="Visualização de como o checklist será apresentado."
        [breadcrumbs]="[
          { label: 'Modelos de inspeção', link: '/inspection-templates' },
          { label: template()?.title ?? 'Prévia' },
        ]"
      >
        <div actions class="actions">
          <a matButton [routerLink]="['/inspection-templates', templateId(), 'edit']">
            <mat-icon>edit</mat-icon>
            Voltar ao construtor
          </a>
          @if (canPublish()) {
            <button matButton="filled" type="button" [disabled]="saving()" (click)="publish()">
              {{ saving() ? 'Publicando…' : 'Publicar modelo' }}
            </button>
          }
        </div>
      </app-page-header>

      @if (loading()) {
        <app-loading-state
          variant="form"
          [rows]="5"
          label="Carregando prévia..."
        />
      } @else if (error()) {
        <div class="error" role="alert">
          <mat-icon>error_outline</mat-icon>
          <p>Não foi possível carregar a prévia do modelo.</p>
          <button matButton="filled" type="button" (click)="load()">
            <mat-icon>refresh</mat-icon>
            Tentar novamente
          </button>
        </div>
      } @else if (template(); as tpl) {
        <section class="summary">
          <div class="summary__top">
            <div>
              <span class="eyebrow">MODELO DE INSPEÇÃO</span>
              <h2>{{ tpl.title }}</h2>
              <p>{{ tpl.description || 'Sem descrição informada.' }}</p>
            </div>

            <app-status-badge
              [value]="tpl.status"
              context="template"
            />
          </div>

          <div class="summary__details">
            <div>
              <span>Categoria</span>
              <strong>{{ tpl.category }}</strong>
            </div>

            <div>
              <span>Versão</span>
              <strong>
                {{ previewVersion() ?? 'Rascunho' }}
              </strong>
            </div>

            <div>
              <span>Seções</span>
              <strong>{{ sections().length }}</strong>
            </div>

            <div>
              <span>Itens</span>
              <strong>{{ totalItems() }}</strong>
            </div>
          </div>
        </section>

        <div class="preview-heading">
          <div>
            <h2>Checklist</h2>
            <p>Confira as perguntas e os tipos de resposta.</p>
          </div>
          <span class="readonly">
            <mat-icon>visibility</mat-icon>
            Somente leitura
          </span>
        </div>

        @if (sections().length === 0) {
          <app-empty-state
            icon="checklist"
            title="Nenhum item cadastrado"
            message="Este modelo ainda não possui seções e itens para exibir."
          />
        } @else {
          <div class="sections">
            @for (section of sections(); track section.id; let index = $index) {
              <section class="section">
                <header class="section__header">
                  <span class="section__number">
                    {{ (index + 1).toString().padStart(2, '0') }}
                  </span>

                  <div>
                    <h3>{{ section.title }}</h3>
                    @if (section.description) {
                      <p>{{ section.description }}</p>
                    }
                  </div>
                </header>

                <div class="items">
                  @for (item of section.items ?? []; track item.id; let itemIndex = $index) {
                    <article class="item">
                      <div class="item__heading">
                        <div>
                          @if (item.code) {
                            <span class="item__code">{{ item.code }}</span>
                          }
                          <h4>{{ item.title }}</h4>
                          @if (item.description) {
                            <p>{{ item.description }}</p>
                          }
                        </div>

                        @if (item.required) {
                          <span class="required">Obrigatório</span>
                        }
                      </div>

                      <div class="item__response">
                        <span class="response-type">
                          {{ responseTypeLabel(item) }}
                        </span>

                        @switch (item.responseType) {
                          @case ('BOOLEAN') {
                            <div class="response-options">
                              <span>Sim</span>
                              <span>Não</span>
                            </div>
                          }
                          @case ('CONFORMITY') {
                            <div class="response-options">
                              <span>Conforme</span>
                              <span>Não conforme</span>
                              <span>Não aplicável</span>
                            </div>
                          }
                          @case ('SINGLE_CHOICE') {
                            <div class="response-options">
                              @for (option of choiceOptions(item); track option) {
                                <span>{{ option }}</span>
                              }
                            </div>
                          }
                          @case ('TEXT_SHORT') {
                            <div class="response-placeholder">Digite sua resposta...</div>
                          }
                          @case ('TEXT_LONG') {
                            <div class="response-placeholder response-placeholder--large">
                              Descreva sua resposta...
                            </div>
                          }
                          @case ('NUMBER') {
                            <div class="response-placeholder">Informe um número...</div>
                          }
                          @case ('DATE') {
                            <div class="response-placeholder">Selecione uma data...</div>
                          }
                        }
                      </div>

                      @if (item.observationRequiredOnFailure || item.evidenceRequiredOnFailure) {
                        <div class="item__rules">
                          @if (item.observationRequiredOnFailure) {
                            <span>
                              <mat-icon>notes</mat-icon>
                              Exige observação na falha
                            </span>
                          }
                          @if (item.evidenceRequiredOnFailure) {
                            <span>
                              <mat-icon>photo_camera</mat-icon>
                              Exige evidência na falha
                            </span>
                          }
                        </div>
                      }
                    </article>
                  }
                </div>
              </section>
            }
          </div>
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
      gap: 1.25rem;
      max-width: 52rem;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .summary,
    .section {
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
    }

    .summary {
      padding: 1.25rem;
    }

    .summary__top {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .eyebrow,
    .summary__details span {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.75rem;
    }

    .summary h2 {
      margin: 0.4rem 0;
      font-size: 1.4rem;
    }

    .summary p,
    .section__header p,
    .item__heading p,
    .preview-heading p {
      color: var(--mat-sys-on-surface-variant);
      margin: 0.35rem 0 0;
    }

    .summary__details {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    .summary__details div {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .preview-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .preview-heading h2 {
      margin: 0;
      font-size: 1.1rem;
    }

    .readonly,
    .item__rules span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.75rem;
    }

    .readonly mat-icon,
    .item__rules mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .sections {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section {
      overflow: hidden;
    }

    .section__header {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      padding: 1.1rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .section__number {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      flex-shrink: 0;
      border-radius: 0.5rem;
      background: var(--mat-sys-surface-container-high);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .section__header h3 {
      margin: 0;
      font-size: 1rem;
    }

    .items {
      display: flex;
      flex-direction: column;
    }

    .item {
      padding: 1.1rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .item:last-child {
      border-bottom: 0;
    }

    .item__heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .item__heading h4 {
      margin: 0.25rem 0;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .item__code {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.7rem;
    }

    .required {
      color: var(--mat-sys-error);
      font-size: 0.7rem;
      white-space: nowrap;
    }

    .item__response {
      margin-top: 1rem;
    }

    .response-type {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.7rem;
    }

    .response-options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .response-options span,
    .response-placeholder {
      padding: 0.65rem 0.8rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.4rem;
      font-size: 0.8rem;
    }

    .response-placeholder {
      margin-top: 0.5rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .response-placeholder--large {
      min-height: 4rem;
    }

    .item__rules {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.85rem;
    }

    .error {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 1rem;
      border: 1px solid var(--mat-sys-error);
      border-radius: 0.5rem;
      color: var(--mat-sys-error);
    }

    @media (max-width: 640px) {
      .summary__details {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .summary__top,
      .preview-heading {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class TemplatePreviewComponent implements OnInit {
    private readonly templates = inject(TemplatesService);
    private readonly auth = inject(AuthStore);
    private readonly confirm = inject(ConfirmDialogService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly templateId = input.required<string>();

    protected readonly loading = signal(false);
    protected readonly error = signal<ApiError | null>(null);
    protected readonly saving = signal(false);
    protected readonly template = signal<InspectionTemplate | null>(null);
    protected readonly sections = signal<TemplateSectionDetail[]>([]);
    protected readonly previewVersion = signal<number | null>(null);

    protected readonly totalItems = computed(() =>
        this.sections().reduce(
            (total, section) => total + (section.items?.length ?? 0),
            0,
        ),
    );

    protected readonly canPublish = computed(
        () =>
            !this.loading() &&
            !this.error() &&
            this.template()?.status === 'DRAFT' &&
            canWrite('inspection-templates', this.auth.role()) &&
            this.sections().some((section) => (section.items?.length ?? 0) > 0),
    );

    ngOnInit(): void {
        this.load();
    }

    protected load(): void {
        this.loading.set(true);
        this.error.set(null);

        this.templates
            .get(this.templateId())
            .pipe(
                switchMap((template) => {
                    this.template.set(template);

                    if (template.status === 'DRAFT') {
                        return this.templates.listDraftSections(template.id).pipe(
                            switchMap((sections) =>
                                of({
                                    sections,
                                    version: null as number | null,
                                }),
                            ),
                        );
                    }

                    return this.templates.listVersions(template.id).pipe(
                        switchMap((page) => {
                            const version = page.content.find(
                                (entry) => entry.versionNumber === template.currentVersion,
                            ) ?? page.content[0];

                            if (!version) {
                                return of({
                                    sections: [] as TemplateSectionDetail[],
                                    version: null as number | null,
                                });
                            }

                            return this.templates.getVersion(version.id).pipe(
                                switchMap((detail) =>
                                    of({
                                        sections: detail.sections ?? [],
                                        version: detail.versionNumber,
                                    }),
                                ),
                            );
                        }),
                    );
                }),
                catchError((thrown: unknown) => {
                    this.error.set(isApiError(thrown) ? thrown : null);
                    return of(null);
                }),
                finalize(() => this.loading.set(false)),
            )
            .subscribe((result) => {
                if (!result) return;

                this.sections.set(
                    [...result.sections]
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((section) => ({
                            ...section,
                            items: [...(section.items ?? [])].sort(
                                (a, b) => a.displayOrder - b.displayOrder,
                            ),
                        })),
                );

                this.previewVersion.set(result.version);
            });
    }

    protected responseTypeLabel(item: TemplateItem): string {
        return RESPONSE_TYPE_LABELS[item.responseType];
    }

    protected choiceOptions(item: TemplateItem): string[] {
        const raw = item.optionsJson?.['options'];

        if (!Array.isArray(raw)) return [];

        return raw
            .map((option) => {
                if (typeof option !== 'object' || option === null) return '';
                const label = (option as { label?: unknown }).label;
                return typeof label === 'string' ? label : '';
            })
            .filter(Boolean);
    }

    publish(): void {
        if (!this.canPublish() || this.saving()) return;

        this.saving.set(true);
        this.confirm
            .open({
                title: 'Publicar modelo',
                message: 'A versão publicada será imutável e estará disponível para novas inspeções.',
                confirmLabel: 'Publicar',
            })
            .pipe(
                switchMap((result) =>
                    result.confirmed ? this.templates.publish(this.templateId()) : of(null),
                ),
                finalize(() => this.saving.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (version) => {
                    if (version) {
                        void this.router.navigate([
                            '/inspection-templates',
                            this.templateId(),
                            'versions',
                        ]);
                    }
                },
                error: (thrown: unknown) => {
                    this.error.set(isApiError(thrown) ? thrown : null);
                },
            });
    }
}
