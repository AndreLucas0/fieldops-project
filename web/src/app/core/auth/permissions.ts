import type { UserRole } from '../models/domain';

/**
 * Autorização da interface administrativa.
 *
 * Espelha a matriz por endpoint de contrato-backend-frontend.md §6.6 e a
 * matriz por tela de telas-frontend.md §2. É **conveniência de interface**:
 * `perfis-de-usuario.md` §5.3 é explícito em que a UI não é barreira suficiente
 * — a API valida a autorização de novo em cada requisição.
 */

const ADMIN_ONLY: readonly UserRole[] = ['ADMIN'];
const SUPERVISOR_ONLY: readonly UserRole[] = ['SUPERVISOR'];
const ADMIN_AND_SUPERVISOR: readonly UserRole[] = ['ADMIN', 'SUPERVISOR'];

export interface RoutePermission {
  /** Padrão de caminho. `:param` casa um segmento; `**` casa o resto. */
  pattern: string;
  roles: readonly UserRole[];
}

/**
 * Ordem importa: o primeiro padrão que casar decide. Rotas mais específicas
 * vêm antes — `/inspections/:id/review` precisa ser avaliada antes de
 * `/inspections/**`, senão um ADMIN entraria na revisão.
 */
export const ROUTE_PERMISSIONS: readonly RoutePermission[] = [
  { pattern: '/dashboard', roles: ADMIN_AND_SUPERVISOR },

  { pattern: '/users', roles: ADMIN_ONLY },
  { pattern: '/users/**', roles: ADMIN_ONLY },

  // Leitura para ADMIN e SUPERVISOR; a escrita é restringida por `canWrite`.
  { pattern: '/clients', roles: ADMIN_AND_SUPERVISOR },
  { pattern: '/clients/**', roles: ADMIN_AND_SUPERVISOR },
  { pattern: '/sites', roles: ADMIN_AND_SUPERVISOR },
  { pattern: '/sites/**', roles: ADMIN_AND_SUPERVISOR },

  { pattern: '/equipment', roles: ADMIN_AND_SUPERVISOR },
  { pattern: '/equipment/**', roles: ADMIN_AND_SUPERVISOR },

  { pattern: '/inspection-templates', roles: ADMIN_AND_SUPERVISOR },
  { pattern: '/inspection-templates/**', roles: ADMIN_AND_SUPERVISOR },

  // Revisão é exclusiva do supervisor (RN-079, §6.6: begin-review/approve/reject).
  { pattern: '/inspections/:inspectionId/review', roles: SUPERVISOR_ONLY },
  { pattern: '/inspections', roles: ADMIN_AND_SUPERVISOR },
  { pattern: '/inspections/**', roles: ADMIN_AND_SUPERVISOR },

  { pattern: '/non-conformities', roles: ADMIN_AND_SUPERVISOR },
  { pattern: '/non-conformities/**', roles: ADMIN_AND_SUPERVISOR },
];

/** Recursos com escrita mais restrita que a leitura (§6.6). */
export type WritableResource =
  | 'users'
  | 'clients'
  | 'sites'
  | 'equipment'
  | 'inspection-templates'
  | 'inspections'
  | 'inspection-review';

export const RESOURCE_WRITE_ROLES: Readonly<Record<WritableResource, readonly UserRole[]>> = {
  users: ADMIN_ONLY,
  clients: ADMIN_ONLY,
  sites: ADMIN_ONLY,
  equipment: ADMIN_AND_SUPERVISOR,
  'inspection-templates': ADMIN_AND_SUPERVISOR,
  inspections: ADMIN_AND_SUPERVISOR,
  'inspection-review': SUPERVISOR_ONLY,
};

/**
 * Perfis autorizados na rota, ou `null` quando nenhum padrão casa — nesse caso
 * a rota não é regida por perfil e basta estar autenticado.
 */
export function rolesForRoute(url: string): readonly UserRole[] | null {
  const path = normalizePath(url);
  return ROUTE_PERMISSIONS.find((entry) => matchesPattern(path, entry.pattern))?.roles ?? null;
}

export function canAccessRoute(url: string, role: UserRole | null): boolean {
  if (!role) return false;
  const roles = rolesForRoute(url);
  return roles === null || roles.includes(role);
}

/** Habilita/desabilita ações de escrita na interface (botões, formulários). */
export function canWrite(resource: WritableResource, role: UserRole | null): boolean {
  if (!role) return false;
  return RESOURCE_WRITE_ROLES[resource].includes(role);
}

export function hasAnyRole(role: UserRole | null, allowed: readonly UserRole[]): boolean {
  if (!role) return false;
  return allowed.length === 0 || allowed.includes(role);
}

/** Remove query string, fragmento e barras redundantes. */
function normalizePath(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0] ?? '';
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function matchesPattern(path: string, pattern: string): boolean {
  const pathSegments = segments(path);
  const patternSegments = segments(pattern);

  for (let index = 0; index < patternSegments.length; index += 1) {
    const expected = patternSegments[index];

    // `**` cobre o resto do caminho, desde que exista ao menos um segmento.
    if (expected === '**') {
      return pathSegments.length > index;
    }

    const actual = pathSegments[index];
    if (actual === undefined) return false;
    if (expected.startsWith(':')) continue;
    if (expected !== actual) return false;
  }

  return pathSegments.length === patternSegments.length;
}

function segments(value: string): string[] {
  return value.split('/').filter((segment) => segment.length > 0);
}
