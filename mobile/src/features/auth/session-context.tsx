import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  AuthError,
  isSessionValid,
  type AuthFailureCode,
  type Credentials,
  type Session,
} from '@/domain/auth';
import { mockAuthService, type AuthService } from './auth-service';
import { sessionStore } from './session-store';

/**
 * `loading` cobre a leitura da sessão gravada no dispositivo: sem esse estado
 * a área protegida piscaria a tela de login a cada abertura do app.
 */
export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

export type SessionContextValue = {
  status: SessionStatus;
  session: Session | null;
  signIn(credentials: Credentials): Promise<void>;
  signOut(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export type SessionProviderProps = {
  children: ReactNode;
  /** Injetável para testes e para a futura troca pelo cliente HTTP real. */
  authService?: AuthService;
};

export function SessionProvider({ children, authService = mockAuthService }: SessionProviderProps) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const stored = await sessionStore.load();
      if (!active) return;

      // Uma sessão expirada é descartada aqui; a renovação por refresh token
      // entra junto com o cliente HTTP.
      if (isSessionValid(stored)) {
        setSession(stored);
        setStatus('signedIn');
      } else {
        if (stored) await sessionStore.clear();
        setSession(null);
        setStatus('signedOut');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (credentials: Credentials) => {
      const created = await authService.signIn(credentials);
      await sessionStore.save(created);
      setSession(created);
      setStatus('signedIn');
    },
    [authService],
  );

  const signOut = useCallback(async () => {
    const current = session;
    setSession(null);
    setStatus('signedOut');
    await sessionStore.clear();

    if (current) {
      // O logout no servidor é melhor esforço: sem rede, a sessão local já saiu.
      try {
        await authService.signOut(current);
      } catch {
        // Silencioso de propósito — o usuário já está fora do aplicativo.
      }
    }
  }, [authService, session]);

  const value = useMemo<SessionContextValue>(
    () => ({ status, session, signIn, signOut }),
    [status, session, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  }
  return context;
}

/** Converte qualquer falha de login no código que a interface sabe exibir. */
export function toAuthFailureCode(error: unknown): AuthFailureCode {
  return error instanceof AuthError ? error.code : 'UNEXPECTED';
}
