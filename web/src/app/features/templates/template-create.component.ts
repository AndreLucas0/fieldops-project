import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, finalize, of } from 'rxjs';

import { isApiError } from '../../core';
import { TemplatesService } from '../../core/services/resources';
import { PageHeaderComponent } from '../../shared/components';

@Component({
  selector: 'app-template-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="page">
      <app-page-header
        title="Novo modelo de inspeção"
        subtitle="Crie um rascunho para configurar as seções e os itens do checklist."
        [breadcrumbs]="[
          { label: 'Modelos de inspeção', link: '/inspection-templates' },
          { label: 'Novo modelo' },
        ]"
      />

      @if (error(); as errorMessage) {
        <p class="error" role="alert">{{ errorMessage }}</p>
      }

      <form class="form" (submit)="$event.preventDefault(); save()">
        <mat-form-field appearance="outline">
          <mat-label>Título</mat-label>
          <input
            matInput
            name="title"
            #titleInput
            required
            maxlength="200"
            [value]="title()"
            (input)="title.set(titleInput.value)"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Categoria</mat-label>
          <input
            matInput
            name="category"
            #categoryInput
            required
            maxlength="100"
            [value]="category()"
            (input)="category.set(categoryInput.value)"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Descrição</mat-label>
          <textarea
            matInput
            #descriptionInput
            rows="4"
            maxlength="1000"
            [value]="description()"
            (input)="description.set(descriptionInput.value)"
          ></textarea>
        </mat-form-field>

        <div class="actions">
          <a matButton routerLink="/inspection-templates">Cancelar</a>
          <button matButton="filled" type="submit" [disabled]="!canSave() || saving()">
            @if (saving()) {
              Criando…
            } @else {
              Criar rascunho
            }
          </button>
        </div>
      </form>
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
      max-width: 46rem;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
      background: var(--mat-sys-surface);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class TemplateCreateComponent {
  private readonly templates = inject(TemplatesService);
  private readonly router = inject(Router);

  protected readonly title = signal('');
  protected readonly category = signal('');
  protected readonly description = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canSave = computed(
    () => this.title().trim().length > 0 && this.category().trim().length > 0,
  );

  protected save(): void {
    if (!this.canSave() || this.saving()) return;

    this.error.set(null);
    this.saving.set(true);
    this.templates
      .create({
        title: this.title().trim(),
        category: this.category().trim(),
        description: this.description().trim() || null,
      })
      .pipe(
        catchError((thrown: unknown) => {
          this.error.set(
            isApiError(thrown) ? thrown.userMessage : 'Não foi possível criar o rascunho.',
          );
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((template) => {
        if (template) void this.router.navigate(['/inspection-templates', template.id, 'edit']);
      });
  }
}
