import { HttpClient, HttpContext, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  clampPageParams,
  serializeSort,
  type Page,
  type PageParams,
  type PageQuery,
  type QueryParams,
  type QueryValue,
  type Sort,
} from '../models/page.model';

export interface RequestOptions {
  params?: QueryParams;
  headers?: Record<string, string>;
  context?: HttpContext;
}

/**
 * Cliente HTTP da aplicação.
 *
 * Concentra a base URL, a montagem de query string e o envio multipart, para
 * que nenhum serviço de feature precise conhecer `HttpClient` diretamente.
 * Autenticação e tratamento de erro ficam nos interceptadores.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  get<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.url(path), this.httpOptions(options));
  }

  /**
   * Listagem paginada. Aplica os limites de `page`/`size` do contrato (§9.1) e
   * ecoa o `sort` pedido no envelope devolvido.
   */
  getPage<T, TFilters extends QueryParams = QueryParams>(
    path: string,
    query: PageQuery<TFilters> = {} as PageQuery<TFilters>,
    options: Omit<RequestOptions, 'params'> = {},
  ): Observable<Page<T>> {
    return this.http.get<Page<T>>(this.url(path), {
      ...this.httpOptions(options),
      params: this.buildPageParams(query),
    });
  }

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? null, this.httpOptions(options));
  }

  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http.put<T>(this.url(path), body ?? null, this.httpOptions(options));
  }

  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http.patch<T>(this.url(path), body ?? null, this.httpOptions(options));
  }

  delete<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http.delete<T>(this.url(path), this.httpOptions(options));
  }

  /**
   * Envio `multipart/form-data` — usado no upload de evidências
   * (contrato-backend-frontend.md §10).
   *
   * O `Content-Type` é deixado a cargo do navegador de propósito: definir o
   * cabeçalho manualmente omite o `boundary` e o servidor rejeita o corpo.
   */
  postMultipart<T>(
    path: string,
    form: FormData | Record<string, MultipartValue>,
    options: RequestOptions = {},
  ): Observable<T> {
    return this.http.post<T>(this.url(path), toFormData(form), this.httpOptions(options));
  }

  /**
   * Igual a `postMultipart`, mas emite os eventos de progresso do upload —
   * necessário para barra de progresso em arquivos grandes.
   */
  uploadWithProgress<T>(
    path: string,
    form: FormData | Record<string, MultipartValue>,
    options: RequestOptions = {},
  ): Observable<HttpEvent<T>> {
    return this.http.post<T>(this.url(path), toFormData(form), {
      ...this.httpOptions(options),
      observe: 'events',
      reportProgress: true,
    });
  }

  /** Download de arquivo (evidência) como blob. */
  getBlob(path: string, options: RequestOptions = {}): Observable<Blob> {
    return this.http.get(this.url(path), {
      ...this.httpOptions(options),
      responseType: 'blob',
    });
  }

  private url(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
  }

  private httpOptions(options: RequestOptions) {
    return {
      params: options.params ? buildHttpParams(options.params) : undefined,
      headers: options.headers,
      context: options.context,
    };
  }

  private buildPageParams(query: PageQuery): HttpParams {
    const { page, size, sort, ...filters } = query as PageParams & QueryParams;
    const clamped = clampPageParams({ page, size });

    return buildHttpParams({
      ...filters,
      page: clamped.page,
      size: clamped.size,
      sort: serializeSort(sort),
    });
  }
}

export type MultipartValue = string | number | boolean | Date | Blob | File | null | undefined;

/**
 * Monta a query string.
 *
 * Regras: `null`/`undefined`/string vazia são omitidos (um filtro em branco não
 * é um filtro); `Date` vira ISO 8601 (§4.1); array repete a chave.
 */
export function buildHttpParams(params: QueryParams): HttpParams {
  let httpParams = new HttpParams();

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;

    if (Array.isArray(value)) {
      for (const item of value as readonly NonNullable<QueryValue>[]) {
        if (item == null || item === '') continue;
        httpParams = httpParams.append(key, serializeQueryValue(item));
      }
      continue;
    }

    httpParams = httpParams.set(key, serializeQueryValue(value));
  }

  return httpParams;
}

function serializeQueryValue(value: NonNullable<QueryValue>): string {
  if (value instanceof Date) return value.toISOString();
  if (isSort(value)) return `${value.field},${value.direction}`;
  return String(value);
}

function isSort(value: unknown): value is Sort {
  return (
    typeof value === 'object' &&
    value !== null &&
    'field' in value &&
    'direction' in value &&
    typeof (value as Sort).field === 'string'
  );
}

export function toFormData(form: FormData | Record<string, MultipartValue>): FormData {
  if (form instanceof FormData) return form;

  const data = new FormData();
  for (const [key, value] of Object.entries(form)) {
    if (value == null) continue;

    if (value instanceof Blob) {
      // `File` é um `Blob` com nome; preservá-lo mantém o nome original.
      data.append(key, value, value instanceof File ? value.name : undefined);
    } else if (value instanceof Date) {
      data.append(key, value.toISOString());
    } else {
      data.append(key, String(value));
    }
  }
  return data;
}
