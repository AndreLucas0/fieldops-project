import { ChangeDetectionStrategy, Component, DestroyRef, OnChanges, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { finalize, map, of, Subscription, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore, canWrite, isApiError } from '../../core';
import type { InspectionTemplate, TemplateItem, TemplateSectionDetail } from '../../core/models/domain';
import { TemplatesService } from '../../core/services/resources';
import { PageHeaderComponent } from '../../shared/components';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RESPONSE_TYPE_LABELS } from './template-item-form-dialog.component';

@Component({
  selector: 'app-template-preview', changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, PageHeaderComponent],
  template: `
    <section class="page">
      <app-page-header [title]="'Prévia — ' + (template()?.title ?? 'Modelo')" subtitle="Confira como o checklist será apresentado ao técnico."
        [breadcrumbs]="[{label:'Modelos',link:'/inspection-templates'},{label:'Prévia'}]">
        <div actions class="actions">
          @if (template()?.status === 'DRAFT') { <a matButton [routerLink]="['/inspection-templates',templateId(),'edit']">Editar</a> }
          <a matButton [routerLink]="['/inspection-templates',templateId(),'versions']">Versões</a>
          @if (canPublish()) { <button matButton="filled" [disabled]="saving()" (click)="publish()">{{saving() ? 'Publicando…' : 'Publicar modelo'}}</button> }
        </div>
      </app-page-header>
      @if (loading()) { <p role="status">Carregando prévia…</p> }
      @if (error()) { <div class="error" role="alert"><p>{{error()}}</p><button matButton (click)="load()">Tentar novamente</button></div> }
      @if (!loading() && !error()) {
        @if (!sections().length) { <p class="notice">Este modelo ainda não tem seções. Adicione seções e itens no construtor antes de publicar.</p> }
        <div class="device" aria-label="Prévia somente leitura do checklist">
          @for (section of sections(); track section.id) {
            <section class="panel"><h2>{{section.title}}</h2>
              @if (section.description) { <p class="description">{{section.description}}</p> }
              @for (item of section.items ?? []; track item.id) {
                <article><h3>{{item.title}} @if(item.required){<span aria-label="Obrigatório">*</span>}</h3>
                  @if(item.description){<p>{{item.description}}</p>}
                  @switch(item.responseType) {
                    @case('CONFORMITY'){<div class="choices"><span>Conforme</span><span>Não conforme</span><span>N/A</span></div>}
                    @case('BOOLEAN'){<div class="choices"><span>Sim</span><span>Não</span></div>}
                    @case('SINGLE_CHOICE'){<div class="choices">@for(option of options(item);track $index){<span>{{option}}</span>}</div>}
                    @case('TEXT_SHORT'){<input disabled [attr.aria-label]="item.title" placeholder="Resposta de texto" />}
                    @case('TEXT_LONG'){<textarea disabled rows="2" [attr.aria-label]="item.title" placeholder="Resposta de texto"></textarea>}
                    @case('NUMBER'){<input disabled type="number" [attr.aria-label]="item.title" placeholder="Resposta numérica" />}
                    @case('DATE'){<input disabled type="date" [attr.aria-label]="item.title" />}
                    @default {<p>{{typeLabel(item)}}</p>}
                  }
                  @if(item.observationRequiredOnFailure){<p class="hint">Observação obrigatória em caso de falha</p>}
                  @if(item.evidenceRequiredOnFailure){<p class="hint">Foto obrigatória em caso de falha</p>}
                  @if(item.responseType === 'SINGLE_CHOICE' && !options(item).length){<p>As alternativas deste item ainda não estão configuradas.</p>}
                </article>
              } @empty {<p>Esta seção ainda não tem itens.</p>}
            </section>
          }
        </div>
      }
    </section>`,
  styles: `:host{display:block;min-width:0}.page{display:flex;flex-direction:column;gap:1.25rem}.actions{display:flex;gap:.5rem;flex-wrap:wrap}.device{width:100%;max-width:28rem;margin:0 auto;display:flex;flex-direction:column;gap:1rem;padding:1rem;border:3px solid var(--mat-sys-outline-variant);border-radius:2rem}.panel{min-width:0;background:var(--mat-sys-surface-container-low);border:1px solid var(--mat-sys-outline-variant);border-radius:1rem;overflow:hidden}h2{font-size:.9rem;text-transform:uppercase;padding:1rem;margin:0;border-bottom:1px solid var(--mat-sys-outline-variant)}article{padding:1rem;border-bottom:1px solid var(--mat-sys-outline-variant)}article:last-child{border:0}h3{font-size:.9rem;line-height:1.5;margin:0 0 .75rem}h3 span{color:var(--mat-sys-primary)}p{line-height:1.5;overflow-wrap:anywhere;color:var(--mat-sys-on-surface-variant)}.description{padding:0 1rem}.hint{font-size:.75rem}.choices{display:flex;flex-wrap:wrap;gap:.5rem}.choices span{flex:1;text-align:center;padding:.5rem;border:1px solid var(--mat-sys-outline-variant);border-radius:.5rem;font-size:.8rem}input,textarea{width:100%;max-width:100%;padding:.75rem;font:inherit;background:var(--mat-sys-surface);color:var(--mat-sys-on-surface);border:1px solid var(--mat-sys-outline-variant);border-radius:.5rem;opacity:1}.error{color:var(--mat-sys-error)}@media(max-width:550px){.device{padding:.5rem;border-width:1px;border-radius:1rem}}`,
})
export class TemplatePreviewComponent implements OnChanges {
  readonly templateId = input.required<string>();
  readonly versionId = input<string>();
  private readonly service = inject(TemplatesService);
  private readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly template = signal<InspectionTemplate | null>(null);
  readonly sections = signal<TemplateSectionDetail[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly canPublish = computed(() => !this.loading() && !this.error() && !this.versionId() && this.template()?.status === 'DRAFT'
    && canWrite('inspection-templates',this.auth.role()) && this.sections().some(s => s.items?.length));
  ngOnChanges(): void { this.load(); }
  load(): void {
    this.request?.unsubscribe(); this.loading.set(true); this.error.set(null); this.sections.set([]);
    const templateId = this.templateId();
    this.request = this.service.get(templateId).pipe(switchMap(template => {
      this.template.set(template);
      if (!this.versionId() && template.status === 'DRAFT') return this.service.listDraftSections(templateId);
      const version = this.versionId() ? of(this.versionId()!) : this.service.listVersions(templateId,{page:0,size:1,sort:'versionNumber,desc'}).pipe(map(page => page.content[0]?.id));
      return version.pipe(switchMap(id => id ? this.service.getVersion(id) : of(null)),map(snapshot => {
        if (snapshot && snapshot.templateId !== templateId) throw new Error('Versão de outro modelo');
        return snapshot?.sections ?? [];
      }));
    }),finalize(() => this.loading.set(false)),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: sections => this.sections.set([...sections].sort((a,b)=>a.displayOrder-b.displayOrder).map(section=>({...section,items:[...(section.items??[])].sort((a,b)=>a.displayOrder-b.displayOrder)}))),
      error: (error:unknown) => this.error.set(isApiError(error)?error.userMessage:'Não foi possível carregar a prévia.'),
    });
  }
  options(item: TemplateItem): string[] {
    // Mesmo formato provisório de readChoiceOptions no mobile (PEND-03).
    const options = item.optionsJson?.['options'] ?? item.optionsJson?.['choices'];
    if (!Array.isArray(options)) return [];
    return options.flatMap((option): string[] => {
      if (typeof option === 'string') return [option];
      if (typeof option !== 'object' || !option || Array.isArray(option)) return [];
      const value = option['value'];
      return typeof value === 'string' && value ? [typeof option['label'] === 'string' ? option['label'] : value] : [];
    });
  }
  typeLabel(item: TemplateItem): string { return RESPONSE_TYPE_LABELS[item.responseType]; }
  publish(): void {
    if (!this.canPublish() || this.saving()) return;
    this.saving.set(true);
    this.confirm.open({title:'Publicar modelo',message:'A versão publicada será imutável e estará disponível para novas inspeções.',confirmLabel:'Publicar'})
      .pipe(switchMap(result=>result.confirmed ? this.service.publish(this.templateId()) : of(null)),finalize(()=>this.saving.set(false)),takeUntilDestroyed(this.destroyRef))
      .subscribe({next:version=>{if(version) void this.router.navigate(['/inspection-templates',this.templateId(),'versions']);},error:(error:unknown)=>this.error.set(isApiError(error)?error.userMessage:'Não foi possível publicar. O rascunho foi preservado.')});
  }
}
