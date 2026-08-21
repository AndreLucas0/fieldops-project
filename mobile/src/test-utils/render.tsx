import { USER_IDS } from '@fieldops/shared';
import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import { SessionProvider } from '@/features/auth/session-context';
import type { AuthSession } from '@/models';
import { ApiClient, AuthService, sessionStorage, type ApiConfig } from '@/services';

/** Sem métricas explícitas o `useSafeAreaInsets` não resolve fora do device. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export const SESSION_KEY = 'fieldops.session';

/** Backend fictício sem latência — os testes não esperam por relógio. */
export const TEST_API_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:8080/api/v1',
  mockEnabled: true,
  mockLatencyMs: 0,
  timeoutMs: 1_000,
};

export function buildSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    expiresAt: Date.now() + 15 * 60 * 1000,
    user: {
      id: USER_IDS.technician,
      name: 'Carlos Souza',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
    },
    ...overrides,
  };
}

/** Deixa uma sessão já gravada, como se o app tivesse sido reaberto. */
export async function seedStoredSession(
  session: AuthSession = buildSession(),
): Promise<AuthSession> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** `AuthService` ligado ao backend fictício, isolado por teste. */
export function buildTestAuthService(overrides: Partial<ApiConfig> = {}): AuthService {
  const client = new ApiClient({
    getConfig: () => ({ ...TEST_API_CONFIG, ...overrides }),
    storage: sessionStorage,
  });

  return new AuthService({
    client,
    storage: sessionStorage,
    // Fora de uma árvore de navegação montada, o redirect não é possível.
    navigation: { toLogin: () => {} },
  });
}

export type RenderWithSessionOptions = RenderOptions & {
  service?: AuthService;
};

/** `render` do RTL 14 é assíncrono: o retorno precisa ser aguardado. */
export function renderWithSession(
  ui: ReactElement,
  { service, ...options }: RenderWithSessionOptions = {},
) {
  const authService = service ?? buildTestAuthService();

  return render(ui, {
    wrapper: ({ children }) => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <SessionProvider service={authService}>{children}</SessionProvider>
      </SafeAreaProvider>
    ),
    ...options,
  });
}
