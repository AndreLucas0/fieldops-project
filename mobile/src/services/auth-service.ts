/**
 * Estado de autenticação do aplicativo.
 *
 * É a única fonte de verdade sobre quem está logado: guarda a sessão no Secure
 * Store, expõe `user`, `isAuthenticated` e `role` de forma reativa, e recebe do
 * `ApiClient` o aviso de que a sessão morreu.
 *
 * A reatividade usa `useSyncExternalStore` em vez de contexto React para que
 * serviços (não só componentes) possam ler e reagir ao estado.
 */

import { useSyncExternalStore } from 'react';
import { router } from 'expo-router';

import {
  isSessionValid,
  toApiError,
  toAuthSession,
  type AuthSession,
  type CurrentUserResponse,
  type LoginRequest,
  type LoginResponse,
  type UserRole,
  type UserSummary,
} from '@/models';

import { apiClient, type ApiClient } from './api-client';
import { sessionStorage, type SessionStorage } from './session-storage';

/**
 * `loading` cobre a leitura da sessão gravada: sem esse estado a área
 * protegida piscaria a tela de login a cada abertura do app.
 */
export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

export interface AuthState {
  status: AuthStatus;
  user: UserSummary | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  session: AuthSession | null;
}

const SIGNED_OUT: AuthState = {
  status: 'signedOut',
  user: null,
  isAuthenticated: false,
  role: null,
  session: null,
};

const INITIAL: AuthState = { ...SIGNED_OUT, status: 'loading' };

/** Para onde ir quando a sessão termina. Injetável para teste. */
export interface AuthNavigation {
  toLogin(): void;
}

const defaultNavigation: AuthNavigation = {
  toLogin: () => {
    try {
      router.replace('/login');
    } catch {
      // Fora de uma árvore de navegação montada (teste, arranque) o redirect
      // não é possível; o layout protegido já cobre esse caso pelo estado.
    }
  },
};

export interface AuthServiceOptions {
  client?: ApiClient;
  storage?: SessionStorage;
  navigation?: AuthNavigation;
}

export class AuthService {
  private readonly client: ApiClient;
  private readonly storage: SessionStorage;
  private navigation: AuthNavigation;

  private state: AuthState = INITIAL;
  private readonly listeners = new Set<() => void>();
  private restoring: Promise<AuthState> | null = null;

  constructor(options: AuthServiceOptions = {}) {
    this.client = options.client ?? apiClient;
    this.storage = options.storage ?? sessionStorage;
    this.navigation = options.navigation ?? defaultNavigation;

    // O cliente HTTP avisa quando o refresh falhou: aqui isso vira logout.
    this.client.onSessionExpired(() => {
      void this.handleSessionExpired();
    });

    // Renovação bem-sucedida atualiza os tokens que o estado carrega.
    this.client.onSessionRenewed((session) => {
      if (this.state.session) this.applySession(session);
    });
  }

  // ---------- Leitura reativa ----------

  getState = (): AuthState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  get user(): UserSummary | null {
    return this.state.user;
  }

  get isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  get role(): UserRole | null {
    return this.state.role;
  }

  /** Troca o destino do logout — usado nos testes. */
  setNavigation(navigation: AuthNavigation): void {
    this.navigation = navigation;
  }

  // ---------- Ações ----------

  /**
   * Lê a sessão gravada no dispositivo. Chamado uma vez na abertura do app.
   * Chamadas simultâneas compartilham a mesma leitura.
   */
  restore(): Promise<AuthState> {
    if (!this.restoring) {
      this.restoring = this.performRestore().finally(() => {
        this.restoring = null;
      });
    }
    return this.restoring;
  }

  private async performRestore(): Promise<AuthState> {
    const stored = await this.storage.load();

    if (!stored) return this.setState(SIGNED_OUT);

    if (isSessionValid(stored)) return this.applySession(stored);

    // Token vencido não é motivo para expulsar: o refresh token pode valer.
    // `getCurrentUser` dispara 401 → refresh → repetição dentro do ApiClient.
    this.applySession(stored);
    try {
      await this.getCurrentUser();
      return this.state;
    } catch {
      await this.storage.clear();
      return this.setState(SIGNED_OUT);
    }
  }

  /** `POST /auth/login`. Erros chegam como `ApiError` (código do contrato). */
  async login(credentials: LoginRequest): Promise<AuthSession> {
    let response: LoginResponse;

    try {
      response = await this.client.post<LoginResponse>(
        '/auth/login',
        {
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        },
        { authenticated: false },
      );
    } catch (error) {
      // Uma tentativa recusada encerra a dúvida do estado inicial: não há
      // sessão. Quem já estava logado não perde a sessão por um erro de digitação.
      if (this.state.status !== 'signedIn') this.setState(SIGNED_OUT);
      throw error;
    }

    const session = toAuthSession(response);
    await this.storage.save(session);
    this.applySession(session);
    return session;
  }

  /**
   * `POST /auth/logout`, limpeza do Secure Store e volta para o login.
   *
   * A chamada ao servidor vem antes da limpeza porque ela ainda precisa do
   * token; se falhar, a sessão local é apagada do mesmo jeito — o usuário não
   * pode ficar preso dentro do app por falta de rede (AC-AUTH).
   */
  async logout(): Promise<void> {
    if (this.state.session) {
      try {
        await this.client.post<void>('/auth/logout', undefined, { timeoutMs: 5_000 });
      } catch {
        // Melhor esforço: o encerramento local é o que importa aqui.
      }
    }

    await this.storage.clear();
    this.setState(SIGNED_OUT);
    this.navigation.toLogin();
  }

  /** `GET /auth/me` — confirma o usuário do token e atualiza o estado. */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    const me = await this.client.get<CurrentUserResponse>('/auth/me');

    const current = this.state.session;
    if (current) {
      const user: UserSummary = {
        id: me.id,
        name: me.name,
        email: me.email,
        role: me.role,
      };
      const updated: AuthSession = { ...current, user };
      await this.storage.save(updated);
      this.applySession(updated);
    }

    return me;
  }

  /** Chamado pelo `ApiClient` quando nem o refresh token vale mais. */
  private async handleSessionExpired(): Promise<void> {
    if (this.state.status === 'signedOut') return;

    await this.storage.clear();
    this.setState(SIGNED_OUT);
    this.navigation.toLogin();
  }

  // ---------- Estado ----------

  private applySession(session: AuthSession): AuthState {
    return this.setState({
      status: 'signedIn',
      user: session.user,
      isAuthenticated: true,
      role: session.user.role,
      session,
    });
  }

  private setState(next: AuthState): AuthState {
    this.state = next;
    this.listeners.forEach((listener) => listener());
    return next;
  }
}

/** Instância compartilhada, ligada ao `apiClient` padrão. */
export const authService = new AuthService();

/** Estado de autenticação dentro de componentes. */
export function useAuth(): AuthState {
  return useSyncExternalStore(authService.subscribe, authService.getState, authService.getState);
}

/**
 * Traduz uma falha de login no código que a tela sabe exibir. Erros do
 * contrato (`INVALID_CREDENTIALS`, `USER_INACTIVE`) passam direto.
 */
export function toAuthErrorCode(error: unknown): string {
  return toApiError(error).code;
}
