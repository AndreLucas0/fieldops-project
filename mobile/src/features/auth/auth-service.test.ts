import { AuthError } from '@/domain/auth';
import { configureMockAuth, mockAuthService } from './auth-service';

beforeEach(() => {
  configureMockAuth({ latencyMs: 0, online: true });
});

describe('mockAuthService.signIn', () => {
  it('devolve sessão no formato do contrato para credenciais válidas', async () => {
    const before = Date.now();
    const session = await mockAuthService.signIn({
      email: 'tecnico@fieldops.local',
      password: 'fieldops123',
    });

    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken).toEqual(expect.any(String));
    expect(session.expiresAt).toBeGreaterThan(before);
    expect(session.user).toEqual({
      id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
      name: 'Carlos Souza',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
    });
  });

  it('aceita e-mail com caixa e espaços diferentes', async () => {
    const session = await mockAuthService.signIn({
      email: '  Tecnico@FieldOps.Local  ',
      password: 'fieldops123',
    });

    expect(session.user.email).toBe('tecnico@fieldops.local');
  });

  it('usa a mesma mensagem para senha errada e e-mail inexistente (AC-AUTH)', async () => {
    const wrongPassword = await mockAuthService
      .signIn({ email: 'tecnico@fieldops.local', password: 'senha-errada' })
      .catch((error: AuthError) => error);
    const unknownEmail = await mockAuthService
      .signIn({ email: 'ninguem@fieldops.local', password: 'fieldops123' })
      .catch((error: AuthError) => error);

    expect(wrongPassword).toBeInstanceOf(AuthError);
    expect(unknownEmail).toBeInstanceOf(AuthError);
    expect((wrongPassword as AuthError).code).toBe('INVALID_CREDENTIALS');
    expect((unknownEmail as AuthError).code).toBe('INVALID_CREDENTIALS');
    expect((wrongPassword as AuthError).message).toBe((unknownEmail as AuthError).message);
    expect((wrongPassword as AuthError).message).not.toMatch(/cadastrad|existe/i);
  });

  it('recusa usuário inativo (RN-001)', async () => {
    await expect(
      mockAuthService.signIn({ email: 'inativo@fieldops.local', password: 'fieldops123' }),
    ).rejects.toMatchObject({ code: 'USER_INACTIVE' });
  });

  it('informa indisponibilidade de rede sem revelar detalhe técnico', async () => {
    configureMockAuth({ online: false });

    const error = await mockAuthService
      .signIn({ email: 'tecnico@fieldops.local', password: 'fieldops123' })
      .catch((thrown: AuthError) => thrown);

    expect((error as AuthError).code).toBe('NETWORK_UNAVAILABLE');
    expect((error as AuthError).message).toMatch(/sem conexão/i);
  });
});
