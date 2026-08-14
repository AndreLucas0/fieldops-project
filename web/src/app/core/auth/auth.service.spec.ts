import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from '../http/auth.interceptor';
import { errorInterceptor } from '../http/error.interceptor';
import type { LoginResponse } from '../models/session.model';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { TokenStorageService } from './token-storage.service';

const API = '/api/v1';

const LOGIN_RESPONSE: LoginResponse = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 900,
  user: {
    id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
    name: 'Marina Alves',
    email: 'supervisor@fieldops.local',
    role: 'SUPERVISOR',
  },
};

describe('AuthService', () => {
  let auth: AuthService;
  let store: AuthStore;
  let tokens: TokenStorageService;
  let backend: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    auth = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
    tokens = TestBed.inject(TokenStorageService);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    sessionStorage.clear();
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('login', () => {
    it('publica a sessão e converte expiresIn em instante de expiração', () => {
      const antes = Date.now();
      auth.login({ email: 'supervisor@fieldops.local', password: 'senha' }).subscribe();

      const request = backend.expectOne(`${API}/auth/login`);
      expect(request.request.body).toEqual({
        email: 'supervisor@fieldops.local',
        password: 'senha',
      });
      // O login não pode carregar Authorization de uma sessão anterior.
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush(LOGIN_RESPONSE);

      expect(store.snapshot.isAuthenticated).toBe(true);
      expect(store.snapshot.role).toBe('SUPERVISOR');
      expect(store.snapshot.session?.expiresAt).toBeGreaterThanOrEqual(antes + 900_000);
    });

    it('guarda o access token só em memória e o refresh em sessionStorage', () => {
      auth.login({ email: 'a@b.c', password: 'senha' }).subscribe();
      backend.expectOne(`${API}/auth/login`).flush(LOGIN_RESPONSE);

      expect(tokens.getAccessToken()).toBe('access-1');
      expect(sessionStorage.getItem('fieldops.rt')).toBe('refresh-1');
      // O access token nunca é gravado em storage.
      expect(JSON.stringify(sessionStorage)).not.toContain('access-1');
      expect(JSON.stringify(localStorage)).not.toContain('refresh-1');
    });

    it('mantém o usuário fora quando as credenciais são inválidas', () => {
      let falhou = false;
      auth.login({ email: 'a@b.c', password: 'errada' }).subscribe({ error: () => (falhou = true) });

      backend.expectOne(`${API}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(falhou).toBe(true);
      expect(store.snapshot.isAuthenticated).toBe(false);
      expect(tokens.getRefreshToken()).toBeNull();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      auth.login({ email: 'a@b.c', password: 'senha' }).subscribe();
      backend.expectOne(`${API}/auth/login`).flush(LOGIN_RESPONSE);
    });

    it('chama o endpoint, limpa a sessão e volta ao login', () => {
      auth.logout().subscribe();

      backend.expectOne(`${API}/auth/logout`).flush(null);

      expect(store.snapshot.isAuthenticated).toBe(false);
      expect(tokens.getAccessToken()).toBeNull();
      expect(tokens.getRefreshToken()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('encerra a sessão local mesmo se o servidor falhar', () => {
      auth.logout().subscribe();

      backend
        .expectOne(`${API}/auth/logout`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(store.snapshot.isAuthenticated).toBe(false);
      expect(tokens.getRefreshToken()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('getCurrentUser', () => {
    it('atualiza o usuário no store sem trocar os tokens', () => {
      auth.login({ email: 'a@b.c', password: 'senha' }).subscribe();
      backend.expectOne(`${API}/auth/login`).flush(LOGIN_RESPONSE);

      auth.getCurrentUser().subscribe();
      backend.expectOne(`${API}/auth/me`).flush({ ...LOGIN_RESPONSE.user, name: 'Marina A. Alves' });

      expect(store.snapshot.user?.name).toBe('Marina A. Alves');
      expect(store.accessToken).toBe('access-1');
    });
  });

  describe('restoreSession', () => {
    it('devolve false sem refresh token gravado', async () => {
      await expect(firstValue(auth.restoreSession())).resolves.toBe(false);
    });

    it('reconstrói a sessão a partir do refresh token após recarregar a página', async () => {
      tokens.setRefreshToken('refresh-1');

      const restored = firstValue(auth.restoreSession());
      backend.expectOne(`${API}/auth/refresh`).flush({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        expiresIn: 900,
        user: LOGIN_RESPONSE.user,
      });

      await expect(restored).resolves.toBe(true);
      expect(store.snapshot.isAuthenticated).toBe(true);
      expect(store.accessToken).toBe('access-2');
    });

    it('devolve false e limpa tudo quando o refresh token não vale mais', async () => {
      tokens.setRefreshToken('refresh-expirado');

      const restored = firstValue(auth.restoreSession());
      backend
        .expectOne(`${API}/auth/refresh`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(restored).resolves.toBe(false);
      expect(store.snapshot.isAuthenticated).toBe(false);
      expect(tokens.getRefreshToken()).toBeNull();
    });

    it('não chama a API quando a sessão em memória ainda é válida', async () => {
      auth.login({ email: 'a@b.c', password: 'senha' }).subscribe();
      backend.expectOne(`${API}/auth/login`).flush(LOGIN_RESPONSE);

      await expect(firstValue(auth.restoreSession())).resolves.toBe(true);
      backend.expectNone(`${API}/auth/refresh`);
    });
  });
});

/** `firstValueFrom` sem importar rxjs no teste inteiro. */
function firstValue<T>(source: { subscribe: (observer: Record<string, unknown>) => unknown }): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    source.subscribe({
      next: (value: T) => resolve(value),
      error: (error: unknown) => reject(error),
    } as Record<string, unknown>);
  });
}
