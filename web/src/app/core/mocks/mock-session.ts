import { inject, provideAppInitializer, type EnvironmentProviders } from '@angular/core';

import { getMockStore } from '@fieldops/shared';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';

/**
 * Sessão de desenvolvimento do modo fictício.
 *
 * As rotas administrativas são protegidas por `authGuard`, que manda ao
 * `/login` quem não tem sessão. Enquanto a tela de login (FE-W01) não existe,
 * nenhuma tela protegida seria alcançável e não daria para conferir nada
 * localmente.
 *
 * Isto abre a sessão direto no store, sem passar pela rede — o backend fictício
 * cobre os recursos de domínio, não os endpoints de autenticação. Vale só com
 * `mockApi` ligado, e some junto com ele.
 *
 * **Apagar quando FE-W01 entrar.** Não é um caminho de autenticação: é um
 * andaime para a verificação visual.
 */
export function provideMockSession(): EnvironmentProviders {
  return provideAppInitializer(() => {
    if (!environment.mockApi) return;

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
