import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';

import type { Session } from '../models/session.model';
import type { UserRole } from '../models/user.model';
import { NotificationService, type AppNotification } from '../notifications/notification.service';
import { ACCESS_DENIED_MESSAGE, FORBIDDEN_REDIRECT_URL, authGuard, guestGuard } from './auth.guard';
import { AuthStore } from './auth.store';

function buildSession(role: UserRole, overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 900_000,
    user: { id: 'u1', name: 'Marina Alves', email: 'marina@fieldops.local', role },
    ...overrides,
  };
}

function snapshotFor(url: string, roles?: readonly UserRole[]) {
  const route = { data: roles ? { roles } : {}, parent: null } as unknown as ActivatedRouteSnapshot;
  const state = { url } as RouterStateSnapshot;
  return { route, state };
}

describe('authGuard', () => {
  let store: AuthStore;
  let router: Router;
  let avisos: AppNotification[];

  function setup(providers: unknown[] = []) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(providers as never[]),
      ],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    avisos = [];
    TestBed.inject(NotificationService).notifications$.subscribe((aviso) => avisos.push(aviso));
  }

  function run(url: string, roles?: readonly UserRole[]) {
    const { route, state } = snapshotFor(url, roles);
    return TestBed.runInInjectionContext(() => authGuard(route, state)) as boolean | UrlTree;
  }

  beforeEach(() => setup());

  it('manda ao login quem não tem sessão, preservando o destino', () => {
    const resultado = run('/dashboard');

    expect(resultado).toEqual(router.createUrlTree(['/login'], { queryParams: { returnUrl: '/dashboard' } }));
  });

  it('manda ao login quando a sessão está expirada', () => {
    store.setSession(buildSession('ADMIN', { expiresAt: Date.now() - 1_000 }));

    expect(run('/dashboard')).not.toBe(true);
  });

  it('libera o perfil autorizado pelo mapa de rotas', () => {
    store.setSession(buildSession('ADMIN'));

    expect(run('/dashboard')).toBe(true);
    expect(run('/users')).toBe(true);
    expect(run('/users/u1')).toBe(true);
  });

  it('bloqueia o supervisor em usuários e avisa sem detalhar o recurso', () => {
    store.setSession(buildSession('SUPERVISOR'));

    const resultado = run('/users');

    expect(resultado).toBe(false);
    expect(avisos).toEqual([{ tone: 'error', message: ACCESS_DENIED_MESSAGE, requestId: undefined }]);
  });

  it('restringe a revisão da inspeção ao supervisor (RN-079)', () => {
    store.setSession(buildSession('SUPERVISOR'));
    expect(run('/inspections/abc/review')).toBe(true);

    store.setSession(buildSession('ADMIN'));
    expect(run('/inspections/abc/review')).toBe(false);
    // O ADMIN continua entrando no detalhe da inspeção.
    expect(run('/inspections/abc')).toBe(true);
  });

  it('bloqueia técnico em toda a área administrativa', () => {
    store.setSession(buildSession('TECHNICIAN'));

    expect(run('/dashboard')).toBe(false);
    expect(run('/inspections')).toBe(false);
  });

  it('dá precedência ao data.roles declarado na rota', () => {
    store.setSession(buildSession('SUPERVISOR'));

    // O mapa liberaria; a rota exige ADMIN.
    expect(run('/clients', ['ADMIN'])).toBe(false);
    expect(run('/clients', ['ADMIN', 'SUPERVISOR'])).toBe(true);
  });

  it('herda data.roles da rota-pai', () => {
    store.setSession(buildSession('SUPERVISOR'));

    const parent = { data: { roles: ['ADMIN'] as UserRole[] }, parent: null };
    const route = { data: {}, parent } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/qualquer' } as RouterStateSnapshot;

    const resultado = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(resultado).toBe(false);
  });

  it('redireciona ao destino de 403 quando a aplicação configura um', () => {
    TestBed.resetTestingModule();
    setup([{ provide: FORBIDDEN_REDIRECT_URL, useValue: '/forbidden' }]);
    store.setSession(buildSession('SUPERVISOR'));

    const resultado = run('/users');

    expect(resultado).toEqual(router.createUrlTree(['/forbidden']));
  });
});

describe('guestGuard', () => {
  let store: AuthStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  function run() {
    const { route, state } = snapshotFor('/login');
    return TestBed.runInInjectionContext(() => guestGuard(route, state));
  }

  it('libera o login para quem não está autenticado', () => {
    expect(run()).toBe(true);
  });

  it('desvia quem já tem sessão para o dashboard', () => {
    store.setSession(buildSession('SUPERVISOR'));

    expect(run()).toEqual(router.createUrlTree(['/dashboard']));
  });
});
