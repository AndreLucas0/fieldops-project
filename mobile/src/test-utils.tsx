import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '@/features/auth/session-context';

/**
 * Renderiza um componente com os mesmos providers que o app monta na raiz,
 * para que as telas sejam exercitadas como em produção.
 */

const insets = { top: 0, left: 0, right: 0, bottom: 0 };
const frame = { x: 0, y: 0, width: 390, height: 844 };

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Sem retry: um erro em teste deve falhar de imediato, não esperar.
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={{ insets, frame }}>
      <QueryClientProvider client={createTestQueryClient()}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react-native';
