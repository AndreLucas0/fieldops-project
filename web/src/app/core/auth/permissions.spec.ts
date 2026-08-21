import type { UserRole } from '../models/domain';
import { canAccessRoute, canWrite, hasAnyRole, rolesForRoute } from './permissions';

describe('rolesForRoute', () => {
  it('resolve rotas de lista', () => {
    expect(rolesForRoute('/dashboard')).toEqual(['ADMIN', 'SUPERVISOR']);
    expect(rolesForRoute('/users')).toEqual(['ADMIN']);
    expect(rolesForRoute('/non-conformities')).toEqual(['ADMIN', 'SUPERVISOR']);
  });

  it('resolve subrotas pelo padrão `**`', () => {
    expect(rolesForRoute('/users/8a50e30d-2a58-4a24-944e-10a9948abf01')).toEqual(['ADMIN']);
    expect(rolesForRoute('/clients/abc/sites')).toEqual(['ADMIN', 'SUPERVISOR']);
    expect(rolesForRoute('/inspection-templates/abc/edit')).toEqual(['ADMIN', 'SUPERVISOR']);
  });

  it('ignora query string e fragmento', () => {
    expect(rolesForRoute('/users?page=0&size=20')).toEqual(['ADMIN']);
    expect(rolesForRoute('/users#topo')).toEqual(['ADMIN']);
  });

  it('devolve null para rota fora do mapa', () => {
    expect(rolesForRoute('/login')).toBeNull();
    expect(rolesForRoute('/qualquer-outra')).toBeNull();
  });

  it('dá precedência à revisão sobre o padrão genérico de inspeções', () => {
    expect(rolesForRoute('/inspections/abc/review')).toEqual(['SUPERVISOR']);
    expect(rolesForRoute('/inspections/abc')).toEqual(['ADMIN', 'SUPERVISOR']);
    expect(rolesForRoute('/inspections')).toEqual(['ADMIN', 'SUPERVISOR']);
  });
});

describe('canAccessRoute', () => {
  it('permite ADMIN e SUPERVISOR no dashboard', () => {
    expect(canAccessRoute('/dashboard', 'ADMIN')).toBe(true);
    expect(canAccessRoute('/dashboard', 'SUPERVISOR')).toBe(true);
  });

  it('restringe usuários ao ADMIN', () => {
    expect(canAccessRoute('/users', 'ADMIN')).toBe(true);
    expect(canAccessRoute('/users', 'SUPERVISOR')).toBe(false);
    expect(canAccessRoute('/users/novo', 'SUPERVISOR')).toBe(false);
  });

  it('restringe a revisão da inspeção ao SUPERVISOR (RN-079)', () => {
    expect(canAccessRoute('/inspections/abc/review', 'SUPERVISOR')).toBe(true);
    expect(canAccessRoute('/inspections/abc/review', 'ADMIN')).toBe(false);
  });

  it('bloqueia TECHNICIAN e CLIENT_VIEWER em toda a área administrativa', () => {
    const denied: UserRole[] = ['TECHNICIAN', 'CLIENT_VIEWER'];
    const routes = [
      '/dashboard',
      '/users',
      '/clients',
      '/sites',
      '/equipment',
      '/inspection-templates',
      '/inspections',
      '/inspections/abc/review',
      '/non-conformities',
    ];

    for (const role of denied) {
      for (const route of routes) {
        expect(canAccessRoute(route, role)).toBe(false);
      }
    }
  });

  it('nega quando não há perfil', () => {
    expect(canAccessRoute('/dashboard', null)).toBe(false);
  });

  it('libera rota fora do mapa para qualquer perfil autenticado', () => {
    expect(canAccessRoute('/perfil', 'SUPERVISOR')).toBe(true);
  });
});

describe('canWrite', () => {
  it('separa leitura de escrita em clientes e locais', () => {
    expect(canWrite('clients', 'ADMIN')).toBe(true);
    expect(canWrite('clients', 'SUPERVISOR')).toBe(false);
    expect(canWrite('sites', 'SUPERVISOR')).toBe(false);
    // O supervisor lê a lista, mas não a edita.
    expect(canAccessRoute('/clients', 'SUPERVISOR')).toBe(true);
  });

  it('permite escrita de equipamento ao supervisor', () => {
    expect(canWrite('equipment', 'SUPERVISOR')).toBe(true);
    expect(canWrite('equipment', 'ADMIN')).toBe(true);
  });

  it('restringe a revisão ao supervisor e usuários ao admin', () => {
    expect(canWrite('inspection-review', 'SUPERVISOR')).toBe(true);
    expect(canWrite('inspection-review', 'ADMIN')).toBe(false);
    expect(canWrite('users', 'ADMIN')).toBe(true);
    expect(canWrite('users', 'SUPERVISOR')).toBe(false);
  });

  it('nega sem perfil', () => {
    expect(canWrite('inspections', null)).toBe(false);
  });
});

describe('hasAnyRole', () => {
  it('lista vazia significa "qualquer autenticado"', () => {
    expect(hasAnyRole('TECHNICIAN', [])).toBe(true);
    expect(hasAnyRole(null, [])).toBe(false);
  });

  it('compara com a lista informada', () => {
    expect(hasAnyRole('ADMIN', ['ADMIN', 'SUPERVISOR'])).toBe(true);
    expect(hasAnyRole('TECHNICIAN', ['ADMIN'])).toBe(false);
  });
});
