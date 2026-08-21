/**
 * Regras de autenticação que não dependem de rede nem de React.
 * Mantidas puras para serem testadas isoladamente (docs §13.11).
 */

/** Perfis previstos em docs/perfis-de-usuario.md §5.1. */
export const USER_ROLES = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_VIEWER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/** Espelha a resposta de `POST /api/v1/auth/login` (docs/api-rest.md §12.4). */
export type Session = {
  accessToken: string;
  refreshToken: string;
  /** Instante de expiração em epoch ms — derivado de `expiresIn`. */
  expiresAt: number;
  user: AuthenticatedUser;
};

export type Credentials = {
  email: string;
  password: string;
};

export type CredentialErrors = {
  email?: string;
  password?: string;
};

/** Motivos de falha que a interface sabe traduzir. */
export type AuthFailureCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_INACTIVE'
  | 'NETWORK_UNAVAILABLE'
  | 'UNEXPECTED';

export class AuthError extends Error {
  readonly code: AuthFailureCode;

  constructor(code: AuthFailureCode) {
    super(AUTH_ERROR_MESSAGES[code]);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Mensagens em linguagem de negócio (docs §13.9). A de credencial inválida é
 * deliberadamente genérica: AC-AUTH exige não revelar se o e-mail existe.
 */
export const AUTH_ERROR_MESSAGES: Record<AuthFailureCode, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
  USER_INACTIVE: 'Seu acesso está inativo. Procure o administrador da operação.',
  NETWORK_UNAVAILABLE:
    'Sem conexão com o servidor. Conecte-se à internet para entrar pela primeira vez.',
  UNEXPECTED: 'Não foi possível entrar agora. Tente novamente em instantes.',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Comprimento mínimo aceito no cliente; a política real é da API. */
export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateCredentials({ email, password }: Credentials): CredentialErrors {
  const errors: CredentialErrors = {};

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.length === 0) {
    errors.email = 'Informe seu e-mail.';
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = 'Informe um e-mail válido.';
  }

  if (password.length === 0) {
    errors.password = 'Informe sua senha.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  return errors;
}

export function hasCredentialErrors(errors: CredentialErrors): boolean {
  return Boolean(errors.email || errors.password);
}

/** Uma sessão sem token válido não dá acesso à área protegida. */
export function isSessionValid(session: Session | null, now: number = Date.now()): boolean {
  if (!session) return false;
  return session.expiresAt > now;
}

/** Perfis autorizados a usar o aplicativo de campo (docs §5.2). */
const FIELD_APP_ROLES: readonly UserRole[] = ['TECHNICIAN', 'SUPERVISOR', 'ADMIN'];

export function canUseFieldApp(role: UserRole): boolean {
  return FIELD_APP_ROLES.includes(role);
}

export function firstName(user: AuthenticatedUser): string {
  return user.name.trim().split(/\s+/)[0] ?? user.name;
}
