import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { canAccessRoute } from '../../core/auth/permissions';
import { NotificationService } from '../../core/notifications/notification.service';
import type { UserRole } from '../../core/models/domain';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  group: 'OPERAÇÃO' | 'CADASTROS';
}

const NAVIGATION: readonly NavigationItem[] = [
  // Operação
  {
    label: 'Painel',
    route: '/dashboard',
    icon: 'space_dashboard',
    group: 'OPERAÇÃO',
  },
  {
    label: 'Inspeções',
    route: '/inspections',
    icon: 'assignment',
    group: 'OPERAÇÃO',
  },
  {
    label: 'Não conformidades',
    route: '/non-conformities',
    icon: 'report_problem',
    group: 'OPERAÇÃO',
  },

  // Cadastros
  {
    label: 'Modelos',
    route: '/inspection-templates',
    icon: 'fact_check',
    group: 'CADASTROS',
  },
  {
    label: 'Clientes',
    route: '/clients',
    icon: 'business',
    group: 'CADASTROS',
  },
  {
    label: 'Locais',
    route: '/sites',
    icon: 'location_on',
    group: 'CADASTROS',
  },
  {
    label: 'Equipamentos',
    route: '/equipment',
    icon: 'precision_manufacturing',
    group: 'CADASTROS',
  },
  {
    label: 'Usuários',
    route: '/users',
    icon: 'group',
    group: 'CADASTROS',
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

  readonly isMobile = toSignal(
    this.breakpoints.observe('(max-width: 1023px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  readonly user = this.authStore.user;
  readonly roleLabel = computed(() => roleLabel(this.authStore.role()));
  readonly navigation = computed(() =>
    NAVIGATION.filter((item) => canAccessRoute(item.route, this.authStore.role())),
  );
  readonly navigationGroups = computed(() => {
    const items = this.navigation();

    return (['OPERAÇÃO', 'CADASTROS'] as const)
      .map((label) => ({
        label,
        items: items.filter((item) => item.group === label),
      }))
      .filter((group) => group.items.length > 0);
  });

  readonly brandSubtitle = computed(() =>
    this.authStore.role() === 'SUPERVISOR'
      ? 'CONSOLE DE OPERAÇÕES'
      : 'CONSOLE ADMINISTRATIVO',
  );

  constructor() {
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
