import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { ApiService } from '../http/api.service';
import { skipAuth } from '../http/http-context';
import { ApiError } from '../models/api-error.model';
import {
  isSessionValid,
  sessionFromLogin,
  type LoginRequest,
  type LoginResponse,
  type RefreshTokenResponse,
  type Session,
} from '../models/session.model';
import type { UserSummary } from '../models/domain';
import { AuthStore } from './auth.store';
import { TokenStorageService } from './token-storage.service';

export const LOGIN_ROUTE = '/login';

/**
 * Operações de sessão contra a API (contrato-backend-frontend.md §6).
 *
 * O estado vive no `AuthStore`; aqui ficam as chamadas e a política de
 * renovação. As requisições de `/auth/login` e `/auth/refresh` são marcadas com
 * `skipAuth()` para não entrarem no próprio fluxo de renovação.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly store = inject(AuthStore);
  private readonly tokens = inject(TokenStorageService);
  private readonly router = inject(Router);

  /**
   * Renovação em andamento. Vários 401 simultâneos compartilham a mesma
   * chamada em vez de dispararem uma renovação cada.
   */
  private refreshInFlight$: Observable<string> | null = null;

  login(credentials: LoginRequest): Observable<Session> {
    return this.api
      .post<LoginResponse>('/auth/login', credentials, { context: skipAuth() })
      .pipe(map((response) => this.applySession(sessionFromLogin(response))));
  }

  /**
   * Encerra a sessão. A chamada ao servidor é melhor esforço: o estado local é
   * limpo de qualquer forma (AC-AUTH — rotas protegidas devem deixar de ser
   * acessíveis mesmo se a rede falhar).
   */
  logout(): Observable<void> {
    const wasAuthenticated = this.store.snapshot.isAuthenticated;

    const request$ = wasAuthenticated
      ? this.api.post<void>('/auth/logout').pipe(catchError(() => of(void 0)))
      : of(void 0);

    return request$.pipe(
      finalize(() => {
        this.clearSession();
        void this.router.navigate([LOGIN_ROUTE]);
      }),
      map(() => void 0),
    );
  }

  /**
   * Renova o access token. Devolve o novo token para quem precisa repetir a
   * requisição original.
   */
  refreshToken(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      // Sem credencial de renovação não há sessão a recuperar: encerra agora,
      // em vez de deixar o usuário numa tela que não carrega.
      this.forceLogout();
      return throwError(() => noRefreshTokenError());
    }

    this.store.setRefreshing(true);

    this.refreshInFlight$ = this.api
      .post<RefreshTokenResponse>('/auth/refresh', { refreshToken }, { context: skipAuth() })
      .pipe(
        switchMap((response) => {
          const known = response.user ?? this.store.snapshot.user;
          if (known) return of({ response, user: known });
          // O backend não devolve `user` no refresh (RefreshTokenResponse) e,
          // após um F5, o store está vazio: a identidade vem de /auth/me. Vai
          // com `skipAuth()` e o token novo explícito — um 401 aqui não pode
          // reentrar nesta mesma renovação pelo `authInterceptor`.
          return this.api
            .get<UserSummary>('/auth/me', {
              context: skipAuth(),
              headers: { Authorization: `Bearer ${response.accessToken}` },
            })
            .pipe(map((user) => ({ response, user: toUserSummary(user) })));
        }),
        map(({ response, user }) => {
          const session = sessionFromLogin({ ...response, user });
          this.applySession(session);
          return session.accessToken;
        }),
        catchError((error: unknown) => {
          // Refresh inválido/expirado encerra a sessão (§5.2, linha 401).
          this.forceLogout();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
          this.store.setRefreshing(false);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshInFlight$;
  }

  /** `GET /auth/me` — mantém os dados do usuário atualizados no store. */
  getCurrentUser(): Observable<UserSummary> {
    return this.api.get<UserSummary>('/auth/me').pipe(tap((user) => this.store.setUser(user)));
  }

  /**
   * Recupera a sessão após um recarregamento de página.
   *
   * O access token vive só em memória (ver `TokenStorageService`), então o F5
   * o descarta; se ainda houver refresh token, a sessão é reconstruída sem
   * pedir a senha de novo.
   */
  restoreSession(): Observable<boolean> {
    if (isSessionValid(this.store.snapshot.session)) {
      return of(true);
    }
    if (!this.tokens.getRefreshToken()) {
      return of(false);
    }

    return this.refreshToken().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** Encerra a sessão sem chamar o servidor e leva ao login. */
  forceLogout(returnUrl?: string): void {
    this.clearSession();
    void this.router.navigate([LOGIN_ROUTE], {
      queryParams: returnUrl ? { returnUrl } : undefined,
    });
  }

  private applySession(session: Session): Session {
    this.tokens.setAccessToken(session.accessToken);
    this.tokens.setRefreshToken(session.refreshToken);
    this.store.setSession(session);
    return session;
  }

  /**
   * Descarta a sessão local sem chamar o servidor e sem navegar. Usado pelo
   * login quando o perfil autenticado não tem área administrativa.
   */
  clearSession(): void {
    this.tokens.clear();
    this.store.clear();
  }
}

/** `CurrentUserResponse` traz também `status` e `phone`; a sessão guarda só o resumo. */
function toUserSummary({ id, name, email, role }: UserSummary): UserSummary {
  return { id, name, email, role };
}

function noRefreshTokenError(): ApiError {
  return new ApiError({
    kind: 'UNAUTHORIZED',
    status: 401,
    code: 'NO_REFRESH_TOKEN',
    userMessage: 'Sua sessão expirou. Entre novamente.',
  });
}
