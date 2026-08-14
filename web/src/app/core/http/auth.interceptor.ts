import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthStore } from '../auth/auth.store';
import { RETRIED_AFTER_REFRESH, SKIP_AUTH } from './http-context';

/**
 * Autenticação das requisições (contrato-backend-frontend.md §6).
 *
 * - Anexa `Authorization: Bearer <accessToken>` quando há sessão.
 * - Em `401`, renova silenciosamente via `POST /auth/refresh` e repete a
 *   operação original **uma única vez** (AC-AUTH, cenário "token expirado").
 * - Falha na renovação → limpa a sessão e vai para `/login`.
 *
 * Nada é registrado em log aqui: RN-007 proíbe credenciais e tokens em log.
 *
 * Ordem de registro: este interceptador deve ficar **depois** do
 * `errorInterceptor` em `withInterceptors([...])`, para ver o `401` primeiro e
 * resolvê-lo antes que vire mensagem ao usuário.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_AUTH)) {
    return next(request);
  }

  const store = inject(AuthStore);
  const auth = inject(AuthService);

  const authorized = withBearer(request, store.accessToken);

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (!isUnauthorized(error)) {
        return throwError(() => error);
      }

      // Já repetida uma vez: o 401 agora é definitivo.
      if (request.context.get(RETRIED_AFTER_REFRESH)) {
        auth.forceLogout();
        return throwError(() => error);
      }

      return auth.refreshToken().pipe(
        switchMap((accessToken) => {
          const retried = withBearer(request, accessToken).clone({
            context: request.context.set(RETRIED_AFTER_REFRESH, true),
          });

          // O erro da repetição não volta pelo `catchError` externo (ele já
          // está tratando o primeiro 401), então é tratado aqui: um 401 com
          // token recém-renovado significa sessão realmente encerrada.
          return next(retried).pipe(
            catchError((retryError: unknown) => {
              if (isUnauthorized(retryError)) {
                auth.forceLogout();
              }
              return throwError(() => retryError);
            }),
          );
        }),
        catchError((refreshError: unknown) => {
          // `refreshToken()` já limpou a sessão e redirecionou; aqui só
          // propagamos o erro original para quem chamou.
          return throwError(() => refreshError ?? error);
        }),
      );
    }),
  );
};

function withBearer<T>(request: HttpRequest<T>, token: string | null): HttpRequest<T> {
  if (!token) return request;
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}
