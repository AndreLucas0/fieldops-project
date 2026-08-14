import { Injectable } from '@angular/core';

const REFRESH_TOKEN_KEY = 'fieldops.rt';

/**
 * Guarda dos tokens da sessão administrativa.
 *
 * `arquitetura.md` §11.10 pede que a interface web evite persistir tokens em
 * locais desnecessariamente expostos. A divisão adotada:
 *
 * - **access token: só em memória.** Some ao recarregar a página e nunca fica
 *   legível em storage.
 * - **refresh token: `sessionStorage`.** É o mínimo necessário para o F5 não
 *   derrubar o usuário; morre ao fechar a aba e não é compartilhado entre abas,
 *   diferente de `localStorage`.
 *
 * Esta classe é o único ponto que conhece o mecanismo. Trocar por cookie
 * `httpOnly` (a opção mais segura, quando o backend suportar) muda só este
 * arquivo.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private accessToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      // Storage bloqueado (modo restrito do navegador): sessão só em memória.
      return null;
    }
  }

  setRefreshToken(token: string | null): void {
    try {
      if (token) {
        sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Sem storage a sessão simplesmente não sobrevive ao recarregamento.
    }
  }

  /** Remove tudo — usado no logout e em qualquer falha de renovação. */
  clear(): void {
    this.accessToken = null;
    this.setRefreshToken(null);
  }
}
