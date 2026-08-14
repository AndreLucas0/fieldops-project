import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAppInitializer, inject, type EnvironmentProviders, type Provider } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth/auth.service';
import { authInterceptor } from './http/auth.interceptor';
import { errorInterceptor } from './http/error.interceptor';

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
    provideSessionBootstrap(),
  ];
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
