/**
 * Contrato de domínio do FieldOps.
 *
 * As definições vivem em `shared/src/domain`, compartilhadas com o aplicativo
 * Expo. Manter uma cópia própria aqui já custou divergência: `UserRole` era
 * declarado nos dois lados e nada garantia que continuassem iguais.
 *
 * O que **não** vem daqui, de propósito:
 *
 * - `Page`/`PageQuery` — a web tem um modelo próprio em `page.model.ts`, com
 *   filtros tipados e limites do contrato, usado pelo `ApiService`. O envelope
 *   é compatível com o do pacote compartilhado.
 * - `ApiError` e os modelos de sessão — específicos desta aplicação
 *   (interceptador, store, storage de token).
 */

export type {
  Uuid,
  IsoDate,
  IsoDateTime,
  JsonObject,
  GeoLocation,
  PageInfo,
} from '@fieldops/shared/domain/common';

export * from '@fieldops/shared/domain/enums';
export * from '@fieldops/shared/domain/entities';

/** Usuário resumido devolvido pelo login e por `GET /auth/me`. */
export type { UserSummary } from '@fieldops/shared/domain/auth';

import { USER_ROLES, type UserRole } from '@fieldops/shared/domain/enums';

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}
