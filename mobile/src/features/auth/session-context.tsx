import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { AuthError, type AuthFailureCode, type Credentials } from '@/domain/auth';
import { isApiError, type AuthSession } from '@/models';
import { authService as sharedAuthService, type AuthService } from '@/services';

/**
 * Ponte entre as telas e o `AuthService`.
 *
 * O estado de sessão vive no serviço (`@/services/auth-service`), que é quem
 * fala com a API e grava no Secure Store. Este contexto existe só para as telas
 * lerem esse estado com a ergonomia de hook e para os testes injetarem outro
 * serviço.
 */

/**
 * `loading` cobre a leitura da sessão gravada no dispositivo: sem esse estado
 * a área protegida piscaria a tela de login a cada abertura do app.
 */
export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

export type SessionContextValue = {
  status: SessionStatus;
  session: AuthSession | null;
  signIn(credentials: Credentials): Promise<void>;
  signOut(): Promise<void>;
};

const AuthServiceContext = createContext<AuthService>(sharedAuthService);

export type SessionProviderProps = {
  children: ReactNode;
  /** Injetável para testes; em produção é o serviço compartilhado. */
  service?: AuthService;
};

export function SessionProvider({ children, service = sharedAuthService }: SessionProviderProps) {
  useEffect(() => {
    // Lê a sessão gravada uma vez por serviço; chamadas concorrentes
    // compartilham a mesma leitura dentro do `AuthService`.
    void service.restore();
  }, [service]);

  return <AuthServiceContext.Provider value={service}>{children}</AuthServiceContext.Provider>;
}

export function useAuthService(): AuthService {
  return useContext(AuthServiceContext);
}

export function useSession(): SessionContextValue {
  const service = useAuthService();
  const state = useSyncExternalStore(service.subscribe, service.getState, service.getState);

  return useMemo<SessionContextValue>(
    () => ({
      status: state.status,
      session: state.session,
      signIn: async (credentials) => {
        await service.login(credentials);
      },
      signOut: () => service.logout(),
    }),
    [state, service],
  );
}

/**
 * Converte a falha de login no código que a interface sabe exibir.
 *
 * Os códigos de negócio (`INVALID_CREDENTIALS`, `USER_INACTIVE`) vêm do
 * contrato e passam direto; falha de transporte vira indisponibilidade de rede.
 */
export function toAuthFailureCode(error: unknown): AuthFailureCode {
  if (error instanceof AuthError) return error.code;

  if (isApiError(error)) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
      case 'USER_INACTIVE':
        return error.code;
      case 'NETWORK_UNAVAILABLE':
      case 'TIMEOUT':
        return 'NETWORK_UNAVAILABLE';
      default:
        return 'UNEXPECTED';
    }
  }

  return 'UNEXPECTED';
}
