import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import type { Evidence, InspectionDetail } from '../../core/models/domain';
import { InspectionsService } from '../../core/services/resources';

@Component({
  selector: 'app-inspection-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page">
      <a routerLink="/inspections" class="back-link">
        ← Voltar para inspeções
      </a>

      @if (loading()) {
        <p>Carregando inspeção...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (inspection(); as item) {
        <header class="page-header">
          <div>
            <h1>{{ item.title || 'Inspeção sem título' }}</h1>
            <p>Detalhes da inspeção</p>
          </div>

          <span class="status">{{ item.status }}</span>
        </header>

        <section class="card">
          <h2>Informações gerais</h2>

          <div class="details-grid">
            <div>
              <strong>Cliente</strong>
              <p>{{ item.clientId }}</p>
            </div>

            <div>
              <strong>Local</strong>
              <p>{{ item.siteId }}</p>
            </div>

            <div>
              <strong>Técnico</strong>
              <p>{{ item.technicianId }}</p>
            </div>

            <div>
              <strong>Agendada para</strong>
              <p>{{ item.scheduledFor | date:'dd/MM/yyyy HH:mm' }}</p>
            </div>

            <div>
              <strong>Prioridade</strong>
              <p>{{ item.priority }}</p>
            </div>

            <div>
              <strong>Equipamento</strong>
              <p>{{ item.equipmentId || 'Não informado' }}</p>
            </div>
          </div>

          @if (item.instructions) {
            <div class="instructions">
              <strong>Instruções</strong>
              <p>{{ item.instructions }}</p>
            </div>
          }
        </section>

        <section class="card">
          <h2>Checklist</h2>

          @if (item.items?.length) {
            @for (check of item.items; track check.id) {
              <article class="list-item">
                <strong>{{ check.itemTitle }}</strong>
                @if (check.itemDescription) {
                  <p>{{ check.itemDescription }}</p>
                }
              </article>
            }
          } @else {
            <p>Nenhum item de checklist encontrado.</p>
          }
        </section>

        <section class="card">
          <h2>Respostas</h2>

          @if (item.responses?.length) {
            @for (response of item.responses; track response.id) {
              <article class="list-item">
                <strong>Item: {{ response.inspectionItemId }}</strong>
                <p>
                  {{ response.valueText
                    || response.valueNumber
                    || (response.valueBoolean === true ? 'Sim' :
                        response.valueBoolean === false ? 'Não' : 'Sem resposta') }}
                </p>
                @if (response.observation) {
                  <p>Observação: {{ response.observation }}</p>
                }
              </article>
            }
          } @else {
            <p>Nenhuma resposta registrada.</p>
          }
        </section>

        <section class="card">
          <h2>Não conformidades</h2>

          @if (item.nonConformities?.length) {
            @for (nc of item.nonConformities; track nc.id) {
              <article class="list-item">
                <strong>{{ nc.title }}</strong>
                <p>{{ nc.description }}</p>
                <p>Gravidade: {{ nc.severity }} | Estado: {{ nc.status }}</p>
              </article>
            }
          } @else {
            <p>Nenhuma não conformidade registrada.</p>
          }
        </section>

        <section class="card">
          <h2>Histórico de revisões</h2>

          @if (item.reviews?.length) {
            @for (review of item.reviews; track review.id) {
              <article class="list-item">
                <strong>{{ review.decision }}</strong>
                <p>{{ review.reviewedAt | date:'dd/MM/yyyy HH:mm' }}</p>
                @if (review.reason) {
                  <p>Motivo: {{ review.reason }}</p>
                }
                @if (review.comments) {
                  <p>Comentários: {{ review.comments }}</p>
                }
              </article>
            }
          } @else {
            <p>Nenhuma revisão registrada.</p>
          }
        </section>

        <section class="card">
          <h2>Evidências</h2>

          @if (evidence().length) {
            @for (file of evidence(); track file.id) {
              <article class="list-item">
                <strong>{{ file.description || file.type }}</strong>
                <p>{{ file.mimeType }} — {{ file.sizeBytes }} bytes</p>
                @if (file.accessUrl) {
                  <a [href]="file.accessUrl" target="_blank" rel="noopener">
                    Visualizar evidência
                  </a>
                }
              </article>
            }
          } @else {
            <p>Nenhuma evidência encontrada.</p>
          }
        </section>
      }
    </main>
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
    }

    .back-link {
      color: var(--mat-sys-primary);
      text-decoration: none;
      font-weight: 600;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    h1, h2, p {
      margin-top: 0;
    }

    .card {
      padding: 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface);
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }

    .details-grid p,
    .list-item p {
      margin: 0.35rem 0 0;
      overflow-wrap: anywhere;
    }

    .instructions {
      margin-top: 1rem;
    }

    .list-item {
      padding: 0.85rem 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .list-item:last-child {
      border-bottom: 0;
    }

    .status {
      padding: 0.4rem 0.7rem;
      border-radius: 8px;
      background: var(--mat-sys-surface-container-high);
    }

    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class InspectionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly inspections = inject(InspectionsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly inspection = signal<InspectionDetail | null>(null);
  protected readonly evidence = signal<Evidence[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('inspectionId');

    if (!id) {
      this.error.set('Identificador da inspeção não encontrado.');
      this.loading.set(false);
      return;
    }

    this.inspections
      .get(id)
      .pipe(
        catchError(() => {
          this.error.set('Não foi possível carregar os detalhes da inspeção.');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.inspection.set(result));

    this.inspections
      .listEvidence(id)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.evidence.set(result));
  }
}