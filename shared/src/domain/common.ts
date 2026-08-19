/** Tipos compartilhados pelo contrato REST. */

/** UUID em formato canônico — mantido como `string` para não atritar com JSON. */
export type Uuid = string;

/** Data e hora ISO-8601 com fuso (ex. `2026-08-14T13:45:00Z`). */
export type IsoDateTime = string;

/** Data ISO-8601 sem hora (ex. `2026-08-14`). */
export type IsoDate = string;

/** Objeto livre devolvido pela API em campos `*Json` do contrato. */
export type JsonObject = Record<string, unknown>;

/**
 * Localização capturada no dispositivo (RN-062). `accuracyMeters` é opcional
 * porque nem todo aparelho informa precisão; latitude/longitude/`capturedAt`
 * são obrigatórios quando a localização é enviada.
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  capturedAt: IsoDateTime;
}

/** Metadados de paginação (RNF-003). */
export interface PageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Página do contrato: `PageInfo` + `content`. */
export interface Page<T> extends PageInfo {
  content: T[];
}

/** Parâmetros aceitos por qualquer listagem paginada. */
export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
}
