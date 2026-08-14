import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type NotificationTone = 'error' | 'warning' | 'success' | 'info';

export interface AppNotification {
  tone: NotificationTone;
  message: string;
  /** Correlação com o log do servidor; exibir discretamente, se exibir. */
  requestId?: string | null;
}

/**
 * Canal de mensagens da aplicação.
 *
 * Serviço de infraestrutura, sem interface: publica eventos que o shell (a ser
 * construído) consome para renderizar toasts/banners. Mantê-lo aqui permite ao
 * `errorInterceptor` avisar o usuário sem depender de nenhum componente.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly subject = new Subject<AppNotification>();

  readonly notifications$: Observable<AppNotification> = this.subject.asObservable();

  notify(notification: AppNotification): void {
    this.subject.next(notification);
  }

  error(message: string, requestId?: string | null): void {
    this.notify({ tone: 'error', message, requestId });
  }

  warning(message: string, requestId?: string | null): void {
    this.notify({ tone: 'warning', message, requestId });
  }

  success(message: string): void {
    this.notify({ tone: 'success', message });
  }

  info(message: string): void {
    this.notify({ tone: 'info', message });
  }
}
