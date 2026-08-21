/** DTOs de autenticação (`openapi.yaml` §Auth, docs/api-rest.md §12.4). */

import type { Uuid } from './common';
import type { UserRole, UserStatus } from './enums';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Usuário resumido embutido na resposta de login. */
export interface UserSummary {
  id: Uuid;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  /** Duração do access token em segundos. */
  expiresIn: number;
  user: UserSummary;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** `GET /auth/me` — resumo mais status e telefone. */
export interface CurrentUserResponse extends UserSummary {
  status?: UserStatus;
  phone?: string | null;
}

/**
 * Sessão como fica guardada no dispositivo.
 *
 * `expiresIn` (segundos, relativo) vira `expiresAt` (epoch ms, absoluto) na
 * gravação: depois de reabrir o app, só o instante absoluto permite saber se o
 * token ainda vale. O formato é o mesmo já gravado por
 * `features/auth/session-store`, sob a mesma chave do Secure Store.
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: UserSummary;
}

/** Converte a resposta de login na sessão persistida. */
export function toAuthSession(response: LoginResponse, now: number = Date.now()): AuthSession {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: now + response.expiresIn * 1000,
    user: response.user,
  };
}

/** Uma sessão sem token válido não dá acesso à área protegida. */
export function isSessionValid(session: AuthSession | null, now: number = Date.now()): boolean {
  return session !== null && session.expiresAt > now;
}
