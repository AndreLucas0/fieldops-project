/** Perfis previstos em docs/perfis-de-usuario.md §5.1. */
export const USER_ROLES = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_VIEWER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Situações possíveis do usuário (docs/perfis-de-usuario.md §5.4). */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

/**
 * Dados mínimos do usuário devolvidos pelo login e por `GET /auth/me`
 * (contrato-backend-frontend.md §3.2).
 */
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** Registro completo, usado nas telas de gestão de usuários. */
export interface User extends UserSummary {
  status: UserStatus;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}
