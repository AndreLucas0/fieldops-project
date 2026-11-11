import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { canAccessRoute } from '../../core/auth/permissions';
import { NotificationService } from '../../core/notifications/notification.service';
import { DashboardService } from '../../core/services/resources';
import type { UserRole } from '../../core/models/domain';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  /** Contador exibido ao lado do rótulo. */
  badge?: 'pendingReview';
}

interface NavigationGroup {
  label: string;
  items: readonly NavigationItem[];
}

const NAVIGATION: readonly NavigationGroup[] = [
  {
    label: 'OPERAÇÃO',
    items: [
      { label: 'Painel', route: '/dashboard', icon: 'space_dashboard' },
      { label: 'Inspeções', route: '/inspections', icon: 'assignment', badge: 'pendingReview' },
      { label: 'Não conformidades', route: '/non-conformities', icon: 'report_problem' },
    ],
  },
  {
    label: 'CADASTROS',
    items: [
      { label: 'Clientes', route: '/clients', icon: 'business' },
      { label: 'Locais', route: '/sites', icon: 'location_on' },
      { label: 'Equipamentos', route: '/equipment', icon: 'precision_manufacturing' },
      { label: 'Modelos', route: '/inspection-templates', icon: 'fact_check' },
    ],
  },
  {
    label: 'SISTEMA',
    items: [{ label: 'Usuários', route: '/users', icon: 'group' }],
  },
];

/** Casca compartilhada das rotas administrativas autenticadas. */
@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly auth = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly notifications = inject(NotificationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  // Opcional: o contador do menu é conveniência e não pode derrubar a casca.
  private readonly dashboard = inject(DashboardService, { optional: true });

  readonly isMobile = toSignal(
    this.breakpoints.observe('(max-width: 1023px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  readonly user = this.authStore.user;
  readonly roleLabel = computed(() => roleLabel(this.authStore.role()));
  /** Inspeções esperando revisão; `null` enquanto não se sabe (ou se a consulta falhar). */
  readonly pendingReview = signal<number | null>(null);
  /** Grupos do menu só com o que o perfil acessa; grupo vazio some. */
  readonly navigation = computed(() =>
    NAVIGATION.map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessRoute(item.route, this.authStore.role())),
    })).filter((group) => group.items.length > 0),
  );

  constructor() {
    if (this.dashboard && canAccessRoute('/dashboard', this.authStore.role())) {
      this.dashboard
        .summary()
        .pipe(
          catchError(() => of(null)),
          takeUntilDestroyed(),
        )
        .subscribe((summary) => this.pendingReview.set(summary?.inspectionsPendingReview ?? null));
    }

    this.notifications.notifications$.pipe(takeUntilDestroyed()).subscribe((notification) => {
      this.snackBar.open(notification.message, 'Fechar', {
        duration: notification.tone === 'error' ? 7000 : 4500,
        politeness: notification.tone === 'error' ? 'assertive' : 'polite',
        panelClass: [`notification-${notification.tone}`],
      });
    });
  }

  closeOnMobile(drawer: MatSidenav): void {
    if (this.isMobile()) void drawer.close();
  }

  logout(): void {
    this.auth.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}

function roleLabel(role: UserRole | null): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'SUPERVISOR':
      return 'Supervisor';
    case 'TECHNICIAN':
      return 'Técnico';
    case 'CLIENT_VIEWER':
      return 'Cliente';
    default:
      return '';
  }
}
