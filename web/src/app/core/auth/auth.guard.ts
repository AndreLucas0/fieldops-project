import { InjectionToken, inject } from '@angular/core';
import {
  Router,
  type ActivatedRouteSnapshot,
  type CanActivateChildFn,
  type CanActivateFn,
  type CanMatchFn,
  type Route,
  type RouterStateSnapshot,
  type UrlSegment,
  type UrlTree,
} from '@angular/router';

import { isSessionValid } from '../models/session.model';
import type { UserRole } from '../models/user.model';
import { NotificationService } from '../notifications/notification.service';
import { AuthService, LOGIN_ROUTE } from './auth.service';
import { AuthStore } from './auth.store';
import { canAccessRoute, hasAnyRole, rolesForRoute } from './permissions';

/**
 * Destino para o caso "autenticado, mas sem permissão".
 *
 * Padrão `null`: a navegação é apenas bloqueada e o usuário é avisado. Assim
 * não há redirecionamento para uma rota que também poderia ser negada — o que
 * viraria laço. Quando a tela 403 existir, forneça o caminho dela:
 *
 * ```ts
 * { provide: FORBIDDEN_REDIRECT_URL, useValue: '/forbidden' }
 * ```
 */
export const FORBIDDEN_REDIRECT_URL = new InjectionToken<string | null>('FORBIDDEN_REDIRECT_URL', {
  providedIn: 'root',
  factory: () => null,
});

export const ACCESS_DENIED_MESSAGE = 'Acesso negado.';

/**
 * Perfis exigidos por uma rota. Declarar em `data.roles` sobrepõe o mapa de
 * `permissions.ts` — útil para rotas que o mapa não conhece.
 *
 * ```ts
 * { path: 'users', data: { roles: ['ADMIN'] satisfies UserRole[] }, canActivate: [authGuard] }
 * ```
 */
export interface RouteRoleData {
  roles?: readonly UserRole[];
}

export const authGuard: CanActivateFn = (route, state) => {
  return check(state.url, rolesFromRoute(route));
};

export const authGuardChild: CanActivateChildFn = (route, state) => {
  return check(state.url, rolesFromRoute(route));
};

/** Versão para `canMatch` — evita baixar o chunk de uma rota não autorizada. */
export const authGuardMatch: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  const url = `/${segments.map((segment) => segment.path).join('/')}`;
  const declared = (route.data as RouteRoleData | undefined)?.roles;
  return check(url, declared);
};

function rolesFromRoute(route: ActivatedRouteSnapshot): readonly UserRole[] | undefined {
  // Herda de rotas-pai: um layout protegido declara o perfil uma vez só.
  for (let current: ActivatedRouteSnapshot | null = route; current; current = current.parent) {
    const declared = (current.data as RouteRoleData | undefined)?.roles;
    if (declared?.length) return declared;
  }
  return undefined;
}

function check(url: string, declaredRoles: readonly UserRole[] | undefined): boolean | UrlTree {
  const store = inject(AuthStore);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  inject(AuthService); // garante o serviço instanciado para o fluxo de sessão

  const { session, role } = store.snapshot;

  // Sessão ausente ou expirada: login, preservando o destino pretendido.
  if (!isSessionValid(session)) {
    return router.createUrlTree([LOGIN_ROUTE], { queryParams: { returnUrl: url } });
  }

  const allowed = declaredRoles ? hasAnyRole(role, declaredRoles) : canAccessRoute(url, role);
  if (allowed) {
    return true;
  }

  // Autenticado, porém sem perfil para a rota: não revela o recurso (§5.2).
  notifications.error(ACCESS_DENIED_MESSAGE);

  const forbiddenUrl = inject(FORBIDDEN_REDIRECT_URL);
  return forbiddenUrl ? router.createUrlTree([forbiddenUrl]) : false;
}

/**
 * Impede que quem já está autenticado volte ao login — leva ao destino padrão
 * do perfil.
 */
export const guestGuard: CanActivateFn = (_route, _state: RouterStateSnapshot) => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!isSessionValid(store.snapshot.session)) {
    return true;
  }
  return router.createUrlTree([defaultRouteFor(store.snapshot.role)]);
};

/** Primeira rota após o login. ADMIN e SUPERVISOR começam no dashboard. */
export function defaultRouteFor(role: UserRole | null): string {
  if (role && rolesForRoute('/dashboard')?.includes(role)) {
    return '/dashboard';
  }
  return LOGIN_ROUTE;
}
