import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAppInitializer, inject, type EnvironmentProviders, type Provider } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth/auth.service';
import { authInterceptor } from './http/auth.interceptor';
import { errorInterceptor } from './http/error.interceptor';
import { MOCK_RESOURCE_PROVIDERS } from './mocks/mock-services';
import { provideMockSession } from './mocks/mock-session';
import { HTTP_RESOURCE_PROVIDERS } from './services/resources';

/**
 * Infraestrutura HTTP e de sessão da aplicação.
 *
 * **A ordem dos interceptadores é significativa.** A requisição percorre a
 * lista na ordem declarada e a resposta volta na ordem inversa; com
 * `[errorInterceptor, authInterceptor]` o `authInterceptor` fica mais próximo
 * do backend e vê o `401` primeiro, renovando o token antes que o erro vire
 * mensagem ao usuário. Invertendo, todo token expirado produziria um aviso
 * indevido de sessão encerrada.
 */
export function provideCore(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    ...provideResources(),
    provideSessionBootstrap(),
    // Andaime do modo fictício: abre sessão para as rotas protegidas serem
    // alcançáveis enquanto a tela de login (FE-W01) não existe.
    provideMockSession(),
  ];
}

/**
 * Escolhe entre a API real e o backend fictício.
 *
 * A decisão acontece uma vez, aqui: as telas injetam `InspectionsService` e não
 * sabem de onde vieram os dados. Trocar `mockApi` no environment não deve
 * exigir mudança em nenhum componente.
 */
export function provideResources(useMock: boolean = environment.mockApi): Provider[] {
  return useMock ? [...MOCK_RESOURCE_PROVIDERS] : [...HTTP_RESOURCE_PROVIDERS];
}

/**
 * Recupera a sessão antes de a aplicação iniciar.
 *
 * O access token vive só em memória, então um F5 o perde; sem isto o guard
 * mandaria ao login um usuário que ainda tem refresh token válido. A promessa
 * nunca rejeita — falha de renovação apenas resulta em sessão anônima.
 */
export function provideSessionBootstrap(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const auth = inject(AuthService);
    return firstValueFrom(auth.restoreSession()).catch(() => false);
  });
}
