import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { AuthStore, canWrite, isApiError } from '../../core';
import { TemplatesService } from '../../core/services/resources';
import { PageHeaderComponent } from '../../shared/components';

@Component({
  selector: 'app-template-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    PageHeaderComponent,
  ],
  template: ` <section class="page">
    <app-page-header
      title="Novo modelo"
      subtitle="Crie um rascunho para montar as seções e os itens do checklist."
      [breadcrumbs]="[
        { label: 'Modelos', link: '/inspection-templates' },
        { label: 'Novo modelo' },
      ]"
    />
    <div class="layout">
      <form class="panel" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Dados do modelo <span>RASCUNHO</span></h2>
        <div class="fields">
          <mat-form-field appearance="outline"
            ><mat-label>Título</mat-label>
            <input matInput formControlName="title" maxlength="200" required />
            @if (form.controls.title.invalid) {
              <mat-error>Informe um título com até 200 caracteres.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline"
            ><mat-label>Categoria</mat-label>
            <input matInput formControlName="category" maxlength="100" required />
            @if (form.controls.category.invalid) {
              <mat-error>Informe uma categoria com até 100 caracteres.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="description"
            ><mat-label>Descrição</mat-label>
            <textarea matInput formControlName="description" rows="3" maxlength="1000"></textarea>
          </mat-form-field>
        </div>
        @if (error()) {
          <p role="alert">{{ error() }}</p>
        }
        <div class="actions">
          <a matButton routerLink="/inspection-templates">Cancelar</a>
          <button matButton="filled" type="submit" [disabled]="saving() || !canCreate()">
            {{ saving() ? 'Salvando…' : 'Salvar rascunho' }}
          </button>
        </div>
      </form>
      <aside class="panel">
        <h2>Próximos passos</h2>
        <p>Depois de salvar, adicione as seções e perguntas no construtor.</p>
        <p>
          Confira a prévia antes de publicar. A publicação preserva uma versão imutável para as
          inspeções.
        </p>
      </aside>
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
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(15rem, 1fr);
      gap: 1.5rem;
      align-items: start;
    }
    .panel {
      min-width: 0;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 1rem;
      padding: 1.25rem;
    }
    h2 {
      font-size: 1rem;
      margin: 0 0 1.5rem;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
    h2 span {
      font-size: 0.7rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .description {
      grid-column: 1/-1;
    }
    mat-form-field {
      min-width: 0;
      width: 100%;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    p {
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.6;
    }
    [role='alert'] {
      color: var(--mat-sys-error);
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 550px) {
      .fields {
        grid-template-columns: 1fr;
      }
      .panel {
        padding: 1rem;
      }
    }
  `,
})
export class TemplateCreateComponent {
  private readonly service = inject(TemplatesService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  readonly canCreate = computed(() => canWrite('inspection-templates', this.auth.role()));
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]],
    category: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    description: ['', Validators.maxLength(1000)],
  });
  submit(): void {
    if (this.saving() || !this.canCreate()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.service
      .create({
        title: value.title.trim(),
        category: value.category.trim(),
        description: value.description.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (template) => {
          void this.router.navigate(['/inspection-templates', template.id, 'edit']);
        },
        error: (error: unknown) =>
          this.error.set(
            isApiError(error)
              ? error.userMessage
              : 'Não foi possível salvar o modelo. Seus dados foram preservados.',
          ),
      });
  }
}
