/**
 * Modelo de erro padronizado (docs/api-rest.md §12.2 / `openapi.yaml` Error).
 *
 * Toda falha — de rede, de contrato ou de regra de negócio — chega às telas
 * como `ApiError`, para que nenhuma tela precise inspecionar `Response` ou
 * `TypeError` do fetch.
 */

import type { IsoDateTime } from './common';

export interface FieldError {
  field: string;
  message: string;
}

/** Corpo do erro conforme devolvido pela API. */
export interface ApiErrorBody {
  timestamp: IsoDateTime;
  status: number;
  code: string;
  message: string;
  /** Caminho da requisição; ausente em erros gerados no cliente. */
  path?: string;
  requestId?: string;
  fieldErrors?: FieldError[];
}

/**
 * Códigos emitidos pelo próprio cliente, quando a resposta não veio da API.
 * Os demais códigos são strings livres definidas pelo backend
 * (ex. `INSPECTION_REQUIRED_ITEMS_MISSING`).
 */
export const CLIENT_ERROR_CODES = {
  /** Falha de transporte: sem rede, DNS, servidor inacessível. */
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  /** Estourou o tempo limite configurado. */
  TIMEOUT: 'TIMEOUT',
  /** Requisição cancelada pela tela (ex. saiu antes de terminar). */
  REQUEST_ABORTED: 'REQUEST_ABORTED',
  /** 401 que o refresh não conseguiu recuperar — exige novo login. */
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  /** Resposta fora do contrato (corpo ilegível). */
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  UNEXPECTED: 'UNEXPECTED',
} as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];

/** `status: 0` marca erro que nunca chegou a ter resposta HTTP. */
export const NO_HTTP_STATUS = 0;

export class ApiError extends Error implements ApiErrorBody {
  readonly timestamp: IsoDateTime;
  readonly status: number;
  readonly code: string;
  readonly path?: string;
  readonly requestId?: string;
  readonly fieldErrors?: FieldError[];

  constructor(body: ApiErrorBody, options?: { cause?: unknown }) {
    super(body.message, options);
    this.name = 'ApiError';
    this.timestamp = body.timestamp;
    this.status = body.status;
    this.code = body.code;
    this.message = body.message;
    if (body.path !== undefined) this.path = body.path;
    if (body.requestId !== undefined) this.requestId = body.requestId;
    if (body.fieldErrors !== undefined) this.fieldErrors = body.fieldErrors;
  }

  /** Erro produzido no dispositivo, sem resposta do servidor. */
  static client(
    code: ClientErrorCode,
    message: string,
    extra?: { path?: string; status?: number; cause?: unknown },
  ): ApiError {
    return new ApiError(
      {
        timestamp: new Date().toISOString(),
        status: extra?.status ?? NO_HTTP_STATUS,
        code,
        message,
        ...(extra?.path !== undefined ? { path: extra.path } : {}),
      },
      extra?.cause !== undefined ? { cause: extra.cause } : undefined,
    );
  }

  /** Serializa de volta ao formato do contrato (útil em log e teste). */
  toBody(): ApiErrorBody {
    return {
      timestamp: this.timestamp,
      status: this.status,
      code: this.code,
      message: this.message,
      ...(this.path !== undefined ? { path: this.path } : {}),
      ...(this.requestId !== undefined ? { requestId: this.requestId } : {}),
      ...(this.fieldErrors !== undefined ? { fieldErrors: this.fieldErrors } : {}),
    };
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Falha que a tela deve tratar pedindo novo login. */
export function isSessionExpired(error: unknown): boolean {
  return isApiError(error) && error.code === CLIENT_ERROR_CODES.SESSION_EXPIRED;
}

/** Falha de conectividade — merece mensagem diferente de erro de regra. */
export function isNetworkError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.code === CLIENT_ERROR_CODES.NETWORK_UNAVAILABLE ||
      error.code === CLIENT_ERROR_CODES.TIMEOUT)
  );
}

/** Converte qualquer valor capturado em `catch` num `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Não foi possível concluir a operação. Tente novamente.';

  return ApiError.client(CLIENT_ERROR_CODES.UNEXPECTED, message, { cause: error });
}

/** Indexa `fieldErrors` por campo, no formato usado pelos formulários. */
export function fieldErrorsToMap(error: unknown): Record<string, string> {
  if (!isApiError(error) || !error.fieldErrors) return {};

  return error.fieldErrors.reduce<Record<string, string>>((map, item) => {
    // O primeiro erro de cada campo é o exibido; a API pode enviar mais de um.
    if (!(item.field in map)) map[item.field] = item.message;
    return map;
  }, {});
}

/** Reconhece um corpo de erro no formato do contrato. */
export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Partial<ApiErrorBody>;
  return (
    typeof body.status === 'number' &&
    typeof body.code === 'string' &&
    typeof body.message === 'string'
  );
}
