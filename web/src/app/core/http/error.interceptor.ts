import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import {
  ApiError,
  type ApiErrorBody,
  type ApiErrorKind,
  type FieldError,
} from '../models/api-error.model';
import { NotificationService } from '../notifications/notification.service';
import { SKIP_ERROR_NOTIFICATION } from './http-context';

/**
 * Normaliza todo erro HTTP em `ApiError` e avisa o usuário quando cabe.
 *
 * Comportamento por status conforme contrato-backend-frontend.md §5.2. O `401`
 * é deixado passar sem tratamento: quem cuida dele é o `authInterceptor`
 * (renovação + redirecionamento), e duplicar aqui produziria dois avisos.
 *
 * Ordem de registro: **antes** do `authInterceptor`, para que a renovação
 * ocorra antes de qualquer mensagem.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const apiError = toApiError(error);

      logError(apiError, request.method, request.url);

      const shouldNotify =
        apiError.status !== 401 &&
        !apiError.isFormError &&
        !request.context.get(SKIP_ERROR_NOTIFICATION);

      if (shouldNotify) {
        notifications.notify({
          tone: apiError.kind === 'CONFLICT' ? 'warning' : 'error',
          message: apiError.userMessage,
          requestId: apiError.requestId,
        });
      }

      return throwError(() => apiError);
    }),
  );
};

/** Mensagens em linguagem de negócio, nunca o texto cru de exceção (§5.2). */
const GENERIC_MESSAGES: Record<ApiErrorKind, string> = {
  BAD_REQUEST: 'Não foi possível processar os dados enviados. Revise o formulário.',
  UNAUTHORIZED: 'Sua sessão expirou. Entre novamente.',
  FORBIDDEN: 'Acesso negado.',
  NOT_FOUND: 'Não encontrado.',
  CONFLICT: 'Este registro foi alterado por outra pessoa. Recarregue os dados e tente de novo.',
  PAYLOAD_TOO_LARGE: 'O arquivo excede o tamanho máximo permitido.',
  UNSUPPORTED_MEDIA_TYPE: 'Formato de arquivo não suportado.',
  UNPROCESSABLE: 'A operação não atende às regras de negócio.',
  SERVER_ERROR: 'Erro interno. Tente novamente em instantes.',
  NETWORK: 'Sem conexão com o servidor. Verifique sua rede e tente novamente.',
  UNKNOWN: 'Não foi possível concluir a operação.',
};

export function toApiError(response: HttpErrorResponse): ApiError {
  const kind = kindFor(response.status);
  const body = parseBody(response.error);

  return new ApiError({
    kind,
    status: response.status,
    code: body?.code ?? kind,
    userMessage: userMessageFor(kind, body),
    requestId: body?.requestId ?? null,
    path: body?.path ?? response.url ?? null,
    fieldErrors: normalizeFieldErrors(body?.fieldErrors),
    body,
  });
}

function kindFor(status: number): ApiErrorKind {
  if (status === 0) return 'NETWORK';
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 422:
      return 'UNPROCESSABLE';
    default:
      return status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN';
  }
}

/**
 * `403` e `404` usam sempre a mensagem genérica: §5.2 proíbe revelar dados do
 * recurso ou se ele existe para outro usuário. `500` também, para não vazar
 * detalhe de exceção. Nos demais, a mensagem de negócio da API é melhor que
 * qualquer texto fixo.
 */
function userMessageFor(kind: ApiErrorKind, body: ApiErrorBody | null): string {
  if (kind === 'FORBIDDEN' || kind === 'NOT_FOUND' || kind === 'SERVER_ERROR') {
    return GENERIC_MESSAGES[kind];
  }
  const fromServer = body?.message?.trim();
  return fromServer && fromServer.length > 0 ? fromServer : GENERIC_MESSAGES[kind];
}

function parseBody(raw: unknown): ApiErrorBody | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Partial<ApiErrorBody>;
  if (typeof candidate.status !== 'number' && typeof candidate.message !== 'string') {
    return null;
  }

  return {
    timestamp: candidate.timestamp ?? '',
    status: candidate.status ?? 0,
    code: candidate.code ?? '',
    message: candidate.message ?? '',
    path: candidate.path ?? '',
    requestId: candidate.requestId ?? '',
    fieldErrors: normalizeFieldErrors(candidate.fieldErrors),
  };
}

function normalizeFieldErrors(raw: unknown): FieldError[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (entry): entry is FieldError =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as FieldError).field === 'string' &&
        typeof (entry as FieldError).message === 'string',
    )
    .map((entry) => ({ field: entry.field, message: entry.message }));
}

/**
 * Log de diagnóstico. Registra `requestId` para correlacionar com o servidor e
 * **nunca** corpo da requisição, cabeçalhos ou tokens (RN-007).
 */
function logError(error: ApiError, method: string, url: string): void {
  console.error('[api]', {
    requestId: error.requestId,
    status: error.status,
    code: error.code,
    method,
    url,
  });
}
