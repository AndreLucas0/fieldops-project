import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  clearSession,
  loadSession,
  saveSession,
  type Session,
} from '@/infrastructure/storage/session-store';

/**
 * Sessão do técnico.
 *
 * No protótipo isso era o Supabase Auth. Aqui a autenticação é simulada
 * localmente: o formato do retorno já é o da API (docs/api-rest.md §12.4),
 * então trocar por uma chamada a POST /auth/login altera só `signIn`.
 */

interface SessionContextValue {
  session: Session | null;
  /** `true` enquanto a sessão persistida ainda está sendo lida. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadSession()
      .then((stored) => {
        if (active) setSession(stored);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email.trim()) throw new Error('Informe o e-mail');
    if (password.length < 6) throw new Error('A senha deve ter ao menos 6 caracteres');

    // Substituir por POST /api/v1/auth/login quando a API estiver disponível.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const next: Session = {
      accessToken: 'token-de-desenvolvimento',
      user: {
        id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
        name: 'Carlos Técnico',
        email: email.trim(),
        role: 'TECHNICIAN',
      },
    };
    await saveSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [session, loading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa estar dentro de SessionProvider');
  return context;
}
