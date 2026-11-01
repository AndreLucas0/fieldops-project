import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';

import { PageHeaderComponent } from '../../shared/components';

/** Rotas iniciais para que os módulos possam ser desenvolvidos em paralelo. */
@Component({
  selector: 'app-feature-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, PageHeaderComponent],
  templateUrl: './feature-placeholder.component.html',
  styleUrl: './feature-placeholder.component.scss',
})
export class FeaturePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  readonly title = computed(() => (this.routeData()['title'] as string | undefined) ?? 'Área');
  readonly subtitle = computed(
    () => (this.routeData()['subtitle'] as string | undefined) ?? 'Funcionalidade em preparação.',
  );
}
