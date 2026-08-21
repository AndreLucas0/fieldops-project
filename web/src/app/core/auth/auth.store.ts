import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';

import {
  ANONYMOUS_STATE,
  isSessionValid,
  type AuthState,
  type Session,
} from '../models/session.model';
import type { UserRole, UserSummary } from '../models/domain';

/**
 * Estado da sessão.
 *
 * Expõe as duas formas: `Observable` (para interceptadores, guards e código
 * RxJS) e `Signal` (para os componentes standalone). A fonte é única — os
 * sinais derivam do mesmo `BehaviorSubject`.
 *
 * O store guarda estado; quem fala com a API é o `AuthService`.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly state$ = new BehaviorSubject<AuthState>(ANONYMOUS_STATE);
  private readonly stateSignal = signal<AuthState>(ANONYMOUS_STATE);

  /** Estado completo. */
  readonly state = this.state$.asObservable();

  readonly session$: Observable<Session | null> = this.select((state) => state.session);
  readonly user$: Observable<UserSummary | null> = this.select((state) => state.user);
  readonly role$: Observable<UserRole | null> = this.select((state) => state.role);
  readonly isAuthenticated$: Observable<boolean> = this.select((state) => state.isAuthenticated);

  readonly snapshotSignal = this.stateSignal.asReadonly();
  readonly user = computed(() => this.stateSignal().user);
  readonly role = computed(() => this.stateSignal().role);
  readonly isAuthenticated = computed(() => this.stateSignal().isAuthenticated);
  readonly isRefreshing = computed(() => this.stateSignal().isRefreshing);

  /** Leitura síncrona — necessária em interceptador e guard. */
  get snapshot(): AuthState {
    return this.state$.value;
  }

  get accessToken(): string | null {
    return this.snapshot.session?.accessToken ?? null;
  }

  setSession(session: Session): void {
    this.patch({
      session,
      user: session.user,
      role: session.user.role,
      // Uma sessão recém-emitida com token já expirado não autentica ninguém.
      isAuthenticated: isSessionValid(session),
      isRefreshing: false,
    });
  }

  /** Atualiza os dados do usuário sem tocar nos tokens (`GET /auth/me`). */
  setUser(user: UserSummary): void {
    const current = this.snapshot;
    this.patch({
      user,
      role: user.role,
      session: current.session ? { ...current.session, user } : null,
    });
  }

  setRefreshing(isRefreshing: boolean): void {
    this.patch({ isRefreshing });
  }

  clear(): void {
    this.publish(ANONYMOUS_STATE);
  }

  private patch(partial: Partial<AuthState>): void {
    this.publish({ ...this.snapshot, ...partial });
  }

  private publish(next: AuthState): void {
    this.state$.next(next);
    this.stateSignal.set(next);
  }

  private select<T>(project: (state: AuthState) => T): Observable<T> {
    return this.state$.pipe(map(project), distinctUntilChanged());
  }
}
