import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inspection-review',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/inspections">
        ← Voltar para inspeções
      </a>

      <h1>Revisão da inspeção</h1>

      <p>
        A análise das respostas, evidências e não conformidades
        será apresentada nesta tela.
      </p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionReviewComponent {}