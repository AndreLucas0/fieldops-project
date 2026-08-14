import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marca requisições que não devem receber `Authorization` nem participar do
 * fluxo de renovação — `/auth/login` e `/auth/refresh`.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * Marca a requisição já repetida após uma renovação bem-sucedida.
 *
 * AC-AUTH exige que a operação original seja repetida **uma única vez**; sem
 * esta marca, um 401 persistente viraria laço infinito de renovação.
 */
export const RETRIED_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

/**
 * Silencia o aviso global do `errorInterceptor` — para quando a tela trata o
 * erro por conta própria (ex.: validação exibida no próprio formulário).
 */
export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

export function skipAuth(context: HttpContext = new HttpContext()): HttpContext {
  return context.set(SKIP_AUTH, true);
}

export function skipErrorNotification(context: HttpContext = new HttpContext()): HttpContext {
  return context.set(SKIP_ERROR_NOTIFICATION, true);
}
