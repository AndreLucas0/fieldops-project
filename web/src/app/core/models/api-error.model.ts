/**
 * Estrutura única de erro da API — contrato-backend-frontend.md §5.1.
 * Vale para todo endpoint e todo status ≥ 400.
 */

export interface FieldError {
  field: string;
  message: string;
}

/** Corpo devolvido pela API. `fieldErrors` é omitido fora de validação de campo. */
export interface ApiErrorBody {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  requestId: string;
  fieldErrors?: FieldError[];
}

export type ApiErrorKind =
  | 'BAD_REQUEST' // 400
  | 'UNAUTHORIZED' // 401
  | 'FORBIDDEN' // 403
  | 'NOT_FOUND' // 404
  | 'CONFLICT' // 409
  | 'PAYLOAD_TOO_LARGE' // 413
  | 'UNSUPPORTED_MEDIA_TYPE' // 415
  | 'UNPROCESSABLE' // 422
  | 'SERVER_ERROR' // 5xx
  | 'NETWORK' // status 0: offline, DNS, CORS
  | 'UNKNOWN';

/**
 * Erro normalizado que circula pela aplicação.
 *
 * `userMessage` é o texto exibível; `body.message` pode conter linguagem do
 * servidor e nunca é mostrado direto em 5xx (§5.2).
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly path: string | null;
  readonly fieldErrors: readonly FieldError[];
  readonly userMessage: string;
  readonly body: ApiErrorBody | null;

  constructor(init: {
    kind: ApiErrorKind;
    status: number;
    code: string;
    userMessage: string;
    requestId?: string | null;
    path?: string | null;
    fieldErrors?: readonly FieldError[];
    body?: ApiErrorBody | null;
  }) {
    super(init.userMessage);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.userMessage = init.userMessage;
    this.requestId = init.requestId ?? null;
    this.path = init.path ?? null;
    this.fieldErrors = init.fieldErrors ?? [];
    this.body = init.body ?? null;
  }

  get hasFieldErrors(): boolean {
    return this.fieldErrors.length > 0;
  }

  /** Mensagem de um campo específico, para ligar ao controle do formulário. */
  fieldError(field: string): string | null {
    return this.fieldErrors.find((entry) => entry.field === field)?.message ?? null;
  }

  /** `{ campo: mensagem }` — formato direto para `setErrors` em formulários. */
  toFieldErrorMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const entry of this.fieldErrors) {
      map[entry.field] = entry.message;
    }
    return map;
  }

  get isConflict(): boolean {
    return this.kind === 'CONFLICT';
  }

  get isNotFound(): boolean {
    return this.kind === 'NOT_FOUND';
  }

  get isForbidden(): boolean {
    return this.kind === 'FORBIDDEN';
  }

  /** Erros de validação de campo pertencem ao formulário, não ao aviso global. */
  get isFormError(): boolean {
    return (this.kind === 'BAD_REQUEST' || this.kind === 'UNPROCESSABLE') && this.hasFieldErrors;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
