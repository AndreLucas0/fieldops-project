import {
  AuthError,
  normalizeEmail,
  type Credentials,
  type Session,
  type UserRole,
} from '@/domain/auth';

export type AuthService = {
  /** Equivale a `POST /api/v1/auth/login`. */
  signIn(credentials: Credentials): Promise<Session>;
  /** Equivale a `POST /api/v1/auth/logout`. */
  signOut(session: Session): Promise<void>;
};

type MockAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
};

/**
 * Contas de demonstração enquanto a API não está conectada. O formato da
 * resposta segue docs/api-rest.md §12.4, então trocar este serviço pelo cliente
 * HTTP real não deve exigir mudança nas telas.
 */
export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
    name: 'Carlos Souza',
    email: 'tecnico@fieldops.local',
    password: 'fieldops123',
    role: 'TECHNICIAN',
    active: true,
  },
  {
    id: 'c1d0f6b2-4e63-4a58-9f0d-2b7f9c8ad311',
    name: 'Marina Alves',
    email: 'supervisor@fieldops.local',
    password: 'fieldops123',
    role: 'SUPERVISOR',
    active: true,
  },
  {
    id: 'f4c2a9d1-7d4a-4a1e-9d55-3f2b6e0c48aa',
    name: 'Joana Lima',
    email: 'inativo@fieldops.local',
    password: 'fieldops123',
    role: 'TECHNICIAN',
    active: false,
  },
];

/** Duração da sessão em segundos, como o `expiresIn` do contrato. */
const ACCESS_TOKEN_TTL_SECONDS = 900;

/** Latência simulada para que os estados de carregamento sejam visíveis. */
let simulatedLatencyMs = 600;
let networkAvailable = true;

/** Usado pelos testes e pelo modo de demonstração offline. */
export function configureMockAuth(options: { latencyMs?: number; online?: boolean }): void {
  if (options.latencyMs !== undefined) simulatedLatencyMs = options.latencyMs;
  if (options.online !== undefined) networkAvailable = options.online;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function issueToken(prefix: string, accountId: string): string {
  return `${prefix}.${accountId}.${Date.now().toString(36)}`;
}

export const mockAuthService: AuthService = {
  async signIn({ email, password }: Credentials): Promise<Session> {
    await delay(simulatedLatencyMs);

    if (!networkAvailable) {
      throw new AuthError('NETWORK_UNAVAILABLE');
    }

    const normalized = normalizeEmail(email);
    const account = MOCK_ACCOUNTS.find((candidate) => candidate.email === normalized);

    // Conta inexistente e senha errada produzem o mesmo erro: AC-AUTH exige
    // que a mensagem não revele se o e-mail está cadastrado.
    if (!account || account.password !== password) {
      throw new AuthError('INVALID_CREDENTIALS');
    }

    // RN-001: somente usuários ativos iniciam sessão.
    if (!account.active) {
      throw new AuthError('USER_INACTIVE');
    }

    return {
      accessToken: issueToken('access', account.id),
      refreshToken: issueToken('refresh', account.id),
      expiresAt: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
      },
    };
  },

  async signOut(): Promise<void> {
    await delay(Math.min(simulatedLatencyMs, 200));
  },
};
