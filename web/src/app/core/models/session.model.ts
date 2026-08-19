import type { UserRole, UserSummary } from './domain';

/** Corpo de `POST /auth/login` (contrato-backend-frontend.md §3.2). */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Resposta de `POST /auth/login` e de `POST /auth/refresh`. */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  /** Validade do access token em segundos. */
  expiresIn: number;
  user: UserSummary;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * O refresh devolve novos tokens; `user` pode vir ausente quando o servidor
 * apenas renova a credencial (o contrato não fixa isso — PEND-01).
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: UserSummary;
}

/** Sessão como a aplicação a mantém: `expiresIn` já convertido em instante. */
export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Epoch em milissegundos. */
  expiresAt: number;
  user: UserSummary;
}

export interface AuthState {
  session: Session | null;
  user: UserSummary | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  /** Verdadeiro enquanto uma renovação está em andamento. */
  isRefreshing: boolean;
}

export const ANONYMOUS_STATE: AuthState = {
  session: null,
  user: null,
  role: null,
  isAuthenticated: false,
  isRefreshing: false,
};

/**
 * Margem aplicada ao comparar a expiração: evita usar um token que expira
 * durante o trânsito da requisição.
 */
export const TOKEN_EXPIRY_SKEW_MS = 5_000;

export function sessionFromLogin(response: LoginResponse, now: number = Date.now()): Session {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: now + response.expiresIn * 1000,
    user: response.user,
  };
}

export function isSessionValid(session: Session | null, now: number = Date.now()): boolean {
  if (!session?.accessToken) return false;
  return session.expiresAt - TOKEN_EXPIRY_SKEW_MS > now;
}
