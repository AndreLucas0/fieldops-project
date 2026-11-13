import { inject, provideAppInitializer, type EnvironmentProviders } from '@angular/core';

import { getMockStore } from '@fieldops/shared';

import { AuthStore } from '../auth/auth.store';

/**
 * Sessão de desenvolvimento do modo fictício.
 *
 * Abre a sessão direto no store sem passar pela rede, permitindo que o modo
 * fictício funcione sem backend. Registrado por `provideCore(true)` — não
 * incluir manualmente fora desse contexto.
 *
 * O supervisor é o perfil com acesso a tudo que a área administrativa oferece,
 * incluindo a revisão de inspeções (RN-079).
 */
export function provideMockSession(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const store = inject(AuthStore);
    if (store.isAuthenticated()) return;

    // O supervisor é o perfil com acesso a tudo que a área administrativa
    // oferece hoje, incluindo a revisão de inspeções (RN-079).
    const supervisor = getMockStore().users.find((user) => user.role === 'SUPERVISOR');
    if (!supervisor) return;

    store.setSession({
      accessToken: 'mock.access-token',
      refreshToken: 'mock.refresh-token',
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      user: {
        id: supervisor.id,
        name: supervisor.name,
        email: supervisor.email,
        role: supervisor.role,
      },
    });
  });
}
