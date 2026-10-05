import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiError } from '../../core/models/api-error.model';
import { AuthService } from '../../core/auth/auth.service';
import type { Session } from '../../core/models/session.model';
import type { UserRole } from '../../core/models/domain';
import { LoginComponent } from './login.component';

const FAKE_SESSION: Session = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 900_000,
  user: { id: 'u1', name: 'Marina Alves', email: 'marina@fieldops.local', role: 'SUPERVISOR' },
};

function sessionFor(role: UserRole): Session {
  return { ...FAKE_SESSION, user: { ...FAKE_SESSION.user, role } };
}

/** Erro como o `errorInterceptor` entrega a partir do corpo real da API (`ErrorResponse`). */
function apiError(status: number, kind: ApiError['kind'], code: string, userMessage: string): ApiError {
  return new ApiError({ kind, status, code, userMessage });
}

const CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.';

describe('LoginComponent', () => {
  let loginSpy: ReturnType<typeof vi.fn>;
  let clearSessionSpy: ReturnType<typeof vi.fn>;
  let router: Router;

  function setup(queryParams: Record<string, string> = {}) {
    loginSpy = vi.fn(() => of(FAKE_SESSION));
    clearSessionSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { login: loginSpy, clearSession: clearSessionSpy } },
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
    // Corpo real do backend: 401 { code: "UNAUTHORIZED", message: "Invalid email or password" }.
    loginSpy.mockReturnValue(
      throwError(() => apiError(401, 'UNAUTHORIZED', 'UNAUTHORIZED', 'Invalid email or password')),
    );
    fillAndSubmit(fixture, 'errado@email.com', 'senhaErrada');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(CREDENTIALS_MESSAGE);
    expect(el.textContent).not.toContain('Invalid email or password');
    expect(el.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it.each(['User is inactive', 'User is blocked'])(
    '401 de conta "%s" usa a mesma mensagem única, sem revelar o estado da conta (AC-AUTH)',
    (serverMessage) => {
      const fixture = setup();
      loginSpy.mockReturnValue(
        throwError(() => apiError(401, 'UNAUTHORIZED', 'UNAUTHORIZED', serverMessage)),
      );
      fillAndSubmit(fixture, 'inativo@fieldops.local', 'FieldOps@2026');

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain(CREDENTIALS_MESSAGE);
      expect(text).not.toContain(serverMessage);
    },
  );

  it('sem conexão com a API exibe mensagem de rede, não de credencial', () => {
    const fixture = setup();
    loginSpy.mockReturnValue(
      throwError(() => apiError(0, 'NETWORK', 'NETWORK', 'Sem conexão com o servidor.')),
    );
    fillAndSubmit(fixture, 'marina@fieldops.local', 'Senha123!');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sem conexão com o servidor');
    expect(text).not.toContain(CREDENTIALS_MESSAGE);
  });

  it('erro interno da API exibe mensagem para tentar mais tarde', () => {
    const fixture = setup();
    loginSpy.mockReturnValue(
      throwError(() => apiError(500, 'SERVER_ERROR', 'INTERNAL_ERROR', 'Erro interno.')),
    );
    fillAndSubmit(fixture, 'marina@fieldops.local', 'Senha123!');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Não foi possível entrar agora');
    expect(text).not.toContain(CREDENTIALS_MESSAGE);
  });

  it('técnico autenticado não entra na área administrativa: avisa, descarta a sessão e libera o botão', () => {
    const fixture = setup();
    loginSpy.mockReturnValue(of(sessionFor('TECHNICIAN')));
    fillAndSubmit(fixture, 'tecnico@fieldops.local', 'FieldOps@2026');

    const el = fixture.nativeElement as HTMLElement;
    expect(router.navigate).not.toHaveBeenCalled();
    expect(clearSessionSpy).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('não tem acesso à área administrativa');
    const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('navegação recusada após o login libera o botão em vez de deixá-lo preso', async () => {
    const fixture = setup({ returnUrl: '/users' });
    vi.mocked(router.navigate).mockResolvedValue(false);
    fillAndSubmit(fixture, 'marina@fieldops.local', 'Senha123!');
    await fixture.whenStable();
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
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
