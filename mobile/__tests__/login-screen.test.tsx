import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import LoginScreen from '../app/(public)/login';
import { AUTH_ERROR_MESSAGES, MIN_PASSWORD_LENGTH, type Session } from '@/domain/auth';
import { configureMockAuth } from '@/features/auth/auth-service';
import { resetRouterMock, routerMock } from '@/test-utils/expo-router-mock';
import { buildSession, renderWithSession, SESSION_KEY } from '@/test-utils/render';

const VALID = { email: 'tecnico@fieldops.local', password: 'fieldops123' };

beforeEach(() => {
  resetRouterMock();
  // Sem latência artificial os testes não dependem de tempo real.
  configureMockAuth({ latencyMs: 0, online: true });
});

async function fillCredentials(email: string, password: string) {
  await fireEvent.changeText(screen.getByTestId('login-email'), email);
  await fireEvent.changeText(screen.getByTestId('login-password'), password);
}

async function submit() {
  await fireEvent.press(screen.getByTestId('login-submit'));
}

describe('Tela de login', () => {
  it('apresenta os campos de acesso e nenhuma alternativa fora do contrato da API', async () => {
    await renderWithSession(<LoginScreen />);

    expect(screen.getByTestId('login-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('login-email')).toBeOnTheScreen();
    expect(screen.getByTestId('login-password')).toBeOnTheScreen();
    expect(screen.getByTestId('login-submit')).toBeOnTheScreen();

    expect(screen.queryByText(/google/i)).toBeNull();
    expect(screen.queryByText(/cadastre-se/i)).toBeNull();
  });

  it('esconde a senha e permite exibi-la', async () => {
    await renderWithSession(<LoginScreen />);

    expect(screen.getByTestId('login-password').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByTestId('login-password-toggle'));

    expect(screen.getByTestId('login-password').props.secureTextEntry).toBe(false);
  });

  it('exige e-mail e senha antes de chamar o serviço', async () => {
    await renderWithSession(<LoginScreen />);

    await submit();

    expect(screen.getByTestId('login-email-error')).toHaveTextContent('Informe seu e-mail.');
    expect(screen.getByTestId('login-password-error')).toHaveTextContent('Informe sua senha.');
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('recusa e-mail malformado e senha curta', async () => {
    await renderWithSession(<LoginScreen />);

    await fillCredentials('tecnico-sem-arroba', 'curta');
    await submit();

    expect(screen.getByTestId('login-email-error')).toHaveTextContent('Informe um e-mail válido.');
    expect(screen.getByTestId('login-password-error')).toHaveTextContent(
      `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  });

  it('limpa o erro do campo assim que o usuário corrige o valor', async () => {
    await renderWithSession(<LoginScreen />);

    await submit();
    expect(screen.getByTestId('login-email-error')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('login-email'), VALID.email);

    expect(screen.queryByTestId('login-email-error')).toBeNull();
  });

  it('entra com credenciais válidas, guarda a sessão e vai para o início', async () => {
    await renderWithSession(<LoginScreen />);

    await fillCredentials(VALID.email, VALID.password);
    await submit();

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/inicio'));

    const stored = JSON.parse((await SecureStore.getItemAsync(SESSION_KEY)) ?? '{}');
    expect(stored.user.email).toBe(VALID.email);
    expect(stored.accessToken).toEqual(expect.any(String));
    expect(screen.queryByTestId('login-failure')).toBeNull();
  });

  it('mostra mensagem genérica quando a senha está errada (AC-AUTH)', async () => {
    await renderWithSession(<LoginScreen />);

    await fillCredentials(VALID.email, 'senha-errada');
    await submit();

    await waitFor(() => expect(screen.getByTestId('login-failure')).toBeOnTheScreen());
    expect(screen.getByText(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS)).toBeOnTheScreen();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('usa a mesma mensagem para e-mail inexistente, sem revelar o cadastro', async () => {
    await renderWithSession(<LoginScreen />);

    await fillCredentials('desconhecido@fieldops.local', VALID.password);
    await submit();

    await waitFor(() => expect(screen.getByTestId('login-failure')).toBeOnTheScreen());
    expect(screen.getByText(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS)).toBeOnTheScreen();
  });

  it('orienta o usuário inativo em vez de apenas negar (RN-001)', async () => {
    await renderWithSession(<LoginScreen />);

    await fillCredentials('inativo@fieldops.local', VALID.password);
    await submit();

    await waitFor(() => expect(screen.getByTestId('login-failure')).toBeOnTheScreen());
    expect(screen.getByText(AUTH_ERROR_MESSAGES.USER_INACTIVE)).toBeOnTheScreen();
  });

  it('avisa sobre a falta de rede como alerta, não como erro de credencial', async () => {
    configureMockAuth({ online: false });
    await renderWithSession(<LoginScreen />);

    await fillCredentials(VALID.email, VALID.password);
    await submit();

    await waitFor(() => expect(screen.getByTestId('login-failure')).toBeOnTheScreen());
    expect(screen.getByText(AUTH_ERROR_MESSAGES.NETWORK_UNAVAILABLE)).toBeOnTheScreen();
    // O estado não é comunicado só por cor (docs §13.9): há rótulo textual.
    expect(screen.getByText('ATENÇÃO')).toBeOnTheScreen();
  });

  it('substitui o erro anterior ao tentar de novo com sucesso', async () => {
    await renderWithSession(<LoginScreen />);

    await fillCredentials(VALID.email, 'senha-errada');
    await submit();
    await waitFor(() => expect(screen.getByTestId('login-failure')).toBeOnTheScreen());

    await fireEvent.changeText(screen.getByTestId('login-password'), VALID.password);
    await submit();

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/inicio'));
    expect(screen.queryByTestId('login-failure')).toBeNull();
  });

  it('bloqueia o botão e não repete a tentativa enquanto autentica', async () => {
    let release: ((session: Session) => void) | undefined;
    const pending = new Promise<Session>((resolve) => {
      release = resolve;
    });

    const slowService = {
      signIn: jest.fn(() => pending),
      signOut: jest.fn(async () => {}),
    };

    await renderWithSession(<LoginScreen />, { authService: slowService });

    await fillCredentials(VALID.email, VALID.password);
    // `fireEvent` aguarda o handler terminar; aqui o envio fica pendente de
    // propósito, então a promessa só é aguardada depois das asserções.
    const firstPress = submit();
    await waitFor(() => expect(screen.getByTestId('login-submit-loading')).toBeOnTheScreen());

    expect(screen.getByTestId('login-submit')).toBeDisabled();

    // Um segundo toque durante o envio não pode gerar nova tentativa.
    await submit();
    expect(slowService.signIn).toHaveBeenCalledTimes(1);

    // A conclusão do login altera estado: precisa acontecer dentro de `act`.
    await act(async () => {
      release?.(buildSession());
      await firstPress;
    });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/inicio'));
    expect(screen.queryByTestId('login-submit-loading')).toBeNull();
  });
});
