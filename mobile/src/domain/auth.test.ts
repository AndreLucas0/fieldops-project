import {
  canUseFieldApp,
  firstName,
  hasCredentialErrors,
  isSessionValid,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateCredentials,
  type Session,
} from './auth';

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    expiresAt: Date.now() + 60_000,
    user: {
      id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
      name: 'Carlos Souza',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
    },
    ...overrides,
  };
}

describe('normalizeEmail', () => {
  it('remove espaços e uniformiza a caixa', () => {
    expect(normalizeEmail('  Tecnico@FieldOps.Local ')).toBe('tecnico@fieldops.local');
  });
});

describe('validateCredentials', () => {
  it('aceita credenciais completas', () => {
    const errors = validateCredentials({
      email: 'tecnico@fieldops.local',
      password: 'fieldops123',
    });

    expect(errors).toEqual({});
    expect(hasCredentialErrors(errors)).toBe(false);
  });

  it('exige e-mail e senha quando ambos estão vazios', () => {
    const errors = validateCredentials({ email: '', password: '' });

    expect(errors.email).toBe('Informe seu e-mail.');
    expect(errors.password).toBe('Informe sua senha.');
    expect(hasCredentialErrors(errors)).toBe(true);
  });

  it.each(['sem-arroba', 'faltando@dominio', '@fieldops.local', 'a b@fieldops.local'])(
    'rejeita o e-mail malformado %s',
    (email) => {
      expect(validateCredentials({ email, password: 'fieldops123' }).email).toBe(
        'Informe um e-mail válido.',
      );
    },
  );

  it('rejeita senha menor que o mínimo', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);

    expect(validateCredentials({ email: 'tecnico@fieldops.local', password: short }).password).toBe(
      `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  });

  it('valida o e-mail já normalizado', () => {
    expect(
      validateCredentials({ email: '  TECNICO@FIELDOPS.LOCAL ', password: 'fieldops123' }),
    ).toEqual({});
  });
});

describe('isSessionValid', () => {
  it('nega quando não há sessão', () => {
    expect(isSessionValid(null)).toBe(false);
  });

  it('aceita sessão dentro da validade', () => {
    expect(isSessionValid(buildSession({ expiresAt: 2_000 }), 1_000)).toBe(true);
  });

  it('nega sessão expirada', () => {
    expect(isSessionValid(buildSession({ expiresAt: 1_000 }), 2_000)).toBe(false);
  });
});

describe('canUseFieldApp', () => {
  it.each(['TECHNICIAN', 'SUPERVISOR', 'ADMIN'] as const)('permite o perfil %s', (role) => {
    expect(canUseFieldApp(role)).toBe(true);
  });

  it('bloqueia o perfil CLIENT_VIEWER', () => {
    expect(canUseFieldApp('CLIENT_VIEWER')).toBe(false);
  });
});

describe('firstName', () => {
  it('usa apenas o primeiro nome na saudação', () => {
    expect(firstName(buildSession().user)).toBe('Carlos');
  });
});
