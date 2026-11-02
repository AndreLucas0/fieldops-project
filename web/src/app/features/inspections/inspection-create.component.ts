import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-inspection-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1>Nova inspeção</h1>
      <p>Cadastro e agendamento de uma nova inspeção.</p>
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
    }
  `,
})
export class InspectionCreateComponent {}