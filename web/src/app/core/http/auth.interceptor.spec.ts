import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthStore } from '../auth/auth.store';
import { TokenStorageService } from '../auth/token-storage.service';
import type { Session } from '../models/session.model';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

const API = '/api/v1';

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'token-antigo',
    refreshToken: 'refresh-valido',
    expiresAt: Date.now() + 900_000,
    user: {
      id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
      name: 'Marina Alves',
      email: 'supervisor@fieldops.local',
      role: 'SUPERVISOR',
    },
    ...overrides,
  };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let store: AuthStore;
  let tokens: TokenStorageService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        // Mesma ordem usada em produção (ver provideCore).
        provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    tokens = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    sessionStorage.clear();
  });

  afterEach(() => {
    backend.verify();
    sessionStorage.clear();
  });

  function signIn(session: Session = buildSession()): Session {
    tokens.setAccessToken(session.accessToken);
    tokens.setRefreshToken(session.refreshToken);
    store.setSession(session);
    return session;
  }

  it('não envia Authorization quando não há sessão', () => {
    http.get(`${API}/clients`).subscribe();

    const request = backend.expectOne(`${API}/clients`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('anexa o access token da sessão', () => {
    signIn();

    http.get(`${API}/clients`).subscribe();

    const request = backend.expectOne(`${API}/clients`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-antigo');
    request.flush([]);
  });

  it('renova em 401 e repete a operação original uma única vez', () => {
    signIn();
    let resultado: unknown;

    http.get(`${API}/clients`).subscribe((value) => (resultado = value));

    backend.expectOne(`${API}/clients`).flush(null, { status: 401, statusText: 'Unauthorized' });

    const refresh = backend.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-valido' });
    // A própria renovação não pode carregar o token expirado.
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({
      accessToken: 'token-novo',
      refreshToken: 'refresh-novo',
      expiresIn: 900,
      user: buildSession().user,
    });

    const retry = backend.expectOne(`${API}/clients`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer token-novo');
    retry.flush([{ id: 'c1' }]);

    expect(resultado).toEqual([{ id: 'c1' }]);
    expect(store.accessToken).toBe('token-novo');
  });

  it('não entra em laço quando o 401 persiste após a renovação', () => {
    signIn();
    let falhou = false;

    http.get(`${API}/clients`).subscribe({ error: () => (falhou = true) });

    backend.expectOne(`${API}/clients`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/auth/refresh`).flush({
      accessToken: 'token-novo',
      refreshToken: 'refresh-novo',
      expiresIn: 900,
      user: buildSession().user,
    });

    // Segundo 401: a operação já foi repetida, não há nova renovação.
    backend.expectOne(`${API}/clients`).flush(null, { status: 401, statusText: 'Unauthorized' });

    backend.expectNone(`${API}/auth/refresh`);
    expect(falhou).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: undefined });
  });

  it('usa uma única renovação para vários 401 simultâneos', () => {
    signIn();

    http.get(`${API}/clients`).subscribe();
    http.get(`${API}/sites`).subscribe();

    backend.expectOne(`${API}/clients`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/sites`).flush(null, { status: 401, statusText: 'Unauthorized' });

    // Uma renovação só, mesmo com dois 401 em voo.
    const refresh = backend.expectOne(`${API}/auth/refresh`);
    refresh.flush({
      accessToken: 'token-novo',
      refreshToken: 'refresh-novo',
      expiresIn: 900,
      user: buildSession().user,
    });

    backend.expectOne(`${API}/clients`).flush([]);
    backend.expectOne(`${API}/sites`).flush([]);
  });

  it('encerra a sessão e vai ao login quando a renovação falha', () => {
    signIn();
    let falhou = false;

    http.get(`${API}/clients`).subscribe({ error: () => (falhou = true) });

    backend.expectOne(`${API}/clients`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne(`${API}/auth/refresh`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(falhou).toBe(true);
    expect(store.snapshot.isAuthenticated).toBe(false);
    expect(store.accessToken).toBeNull();
    expect(tokens.getRefreshToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: undefined });
  });

  it('vai direto ao login quando o 401 acontece sem refresh token', () => {
    const session = buildSession();
    store.setSession(session);
    tokens.setAccessToken(session.accessToken);
    // Sem refresh token gravado.

    http.get(`${API}/clients`).subscribe({ error: () => undefined });

    backend.expectOne(`${API}/clients`).flush(null, { status: 401, statusText: 'Unauthorized' });

    backend.expectNone(`${API}/auth/refresh`);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: undefined });
  });

  it('não interfere em erros que não são 401', () => {
    signIn();
    let status: number | undefined;

    http.get(`${API}/clients`).subscribe({ error: (error) => (status = error.status) });

    backend.expectOne(`${API}/clients`).flush(null, { status: 500, statusText: 'Server Error' });

    backend.expectNone(`${API}/auth/refresh`);
    expect(status).toBe(500);
  });
});
