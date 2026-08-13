import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import type { Session } from '@/domain/auth';
import type { AuthService } from '@/features/auth/auth-service';
import { SessionProvider } from '@/features/auth/session-context';

/** Sem métricas explícitas o `useSafeAreaInsets` não resolve fora do device. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export const SESSION_KEY = 'fieldops.session';

export function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    expiresAt: Date.now() + 15 * 60 * 1000,
    user: {
      id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
      name: 'Carlos Souza',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
    },
    ...overrides,
  };
}

/** Deixa uma sessão já gravada, como se o app tivesse sido reaberto. */
export async function seedStoredSession(session: Session = buildSession()): Promise<Session> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return session;
}

export type RenderWithSessionOptions = RenderOptions & {
  authService?: AuthService;
};

/** `render` do RTL 14 é assíncrono: o retorno precisa ser aguardado. */
export function renderWithSession(
  ui: ReactElement,
  { authService, ...options }: RenderWithSessionOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <SessionProvider authService={authService}>{children}</SessionProvider>
      </SafeAreaProvider>
    ),
    ...options,
  });
}
