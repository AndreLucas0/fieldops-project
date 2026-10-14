import { ApplicationInitStatus, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { resetMockStore } from '@fieldops/shared';

import { AuthStore } from '../auth/auth.store';
import { provideCore } from '../core.providers';
import { MOCK_LATENCY_MS } from './mock-services';

/**
 * Verifica que `provideCore(true)` injeta automaticamente uma sessão de
 * SUPERVISOR sem passar pela tela de login — comportamento necessário para
 * que o modo fictício seja utilizável sem backend.
 */
describe('inicialização da sessão fictícia', () => {
  beforeEach(() => resetMockStore());

  it('injeta sessão de SUPERVISOR automaticamente quando modo fictício está ativo', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideCore(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
      ],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    const authStore = TestBed.inject(AuthStore);
    expect(authStore.isAuthenticated()).toBe(true);
    expect(authStore.snapshot.session?.user.role).toBe('SUPERVISOR');
  });

  it('não injeta sessão automática quando modo fictício está desativado', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideCore(false),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
      ],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(TestBed.inject(AuthStore).isAuthenticated()).toBe(false);
  });
});
