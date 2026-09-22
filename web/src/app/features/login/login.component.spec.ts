import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiError } from '../../core/models/api-error.model';
import { AuthService } from '../../core/auth/auth.service';
import type { Session } from '../../core/models/session.model';
import { LoginComponent } from './login.component';

const FAKE_SESSION: Session = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 900_000,
  user: { id: 'u1', name: 'Marina Alves', email: 'marina@fieldops.local', role: 'SUPERVISOR' },
};

describe('LoginComponent', () => {
  let loginSpy: ReturnType<typeof vi.fn>;
  let router: Router;

  function setup(queryParams: Record<string, string> = {}) {
    loginSpy = vi.fn(() => of(FAKE_SESSION));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { login: loginSpy } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams } },
        },
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => vi.restoreAllMocks());

  function fillAndSubmit(
    fixture: ReturnType<typeof setup>,
    email: string,
    password: string,
  ): void {
    const el = fixture.nativeElement as HTMLElement;
    const emailInput = el.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = el.querySelector('input[type="password"]') as HTMLInputElement;

    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('renderiza campos de e-mail e senha com botão de envio', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('input[type="email"]')).not.toBeNull();
    expect(el.querySelector('input[type="password"]')).not.toBeNull();
    expect(el.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('login bem-sucedido navega para /dashboard quando não há returnUrl', () => {
    const fixture = setup();
    fillAndSubmit(fixture, 'marina@fieldops.local', 'Senha123!');

    expect(loginSpy).toHaveBeenCalledWith({
      email: 'marina@fieldops.local',
      password: 'Senha123!',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('login bem-sucedido navega para returnUrl quando fornecido', () => {
    const fixture = setup({ returnUrl: '/inspections' });
    fillAndSubmit(fixture, 'marina@fieldops.local', 'Senha123!');

    expect(router.navigate).toHaveBeenCalledWith(['/inspections']);
  });

  it('credenciais inválidas exibem mensagem de erro e mantêm o formulário habilitado', () => {
    const fixture = setup();
    loginSpy.mockReturnValue(
      throwError(
        () =>
          new ApiError({
            kind: 'UNAUTHORIZED',
            status: 401,
            code: 'INVALID_CREDENTIALS',
            userMessage: 'E-mail ou senha inválidos.',
          }),
      ),
    );
    fillAndSubmit(fixture, 'errado@email.com', 'senhaErrada');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('E-mail ou senha inválidos.');
    expect(el.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('formulário vazio não chama o serviço de autenticação', () => {
    const fixture = setup();
    const form = (fixture.nativeElement as HTMLElement).querySelector(
      'form',
    ) as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('erro genérico exibe mensagem padrão', () => {
    const fixture = setup();
    loginSpy.mockReturnValue(throwError(() => new Error('network error')));
    fillAndSubmit(fixture, 'marina@fieldops.local', 'Senha123!');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'E-mail ou senha inválidos.',
    );
  });
});
