import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Page } from '../models/page.model';
import { ApiService, buildHttpParams, toFormData } from './api.service';

interface Sample {
  id: string;
}

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('prefixa a base URL do environment', () => {
    api.get<Sample>('/users').subscribe();

    http.expectOne('/api/v1/users').flush({ id: '1' });
  });

  it('aceita caminho sem barra inicial sem duplicar separador', () => {
    api.get<Sample>('users').subscribe();

    http.expectOne('/api/v1/users').flush({ id: '1' });
  });

  it('não reescreve URL absoluta', () => {
    api.get<Sample>('https://outro.host/recurso').subscribe();

    http.expectOne('https://outro.host/recurso').flush({ id: '1' });
  });

  it.each([
    ['post', 'POST'],
    ['put', 'PUT'],
    ['patch', 'PATCH'],
  ] as const)('envia %s com o corpo informado', (method, verb) => {
    api[method]<Sample>('/users', { name: 'Ana' }).subscribe();

    const request = http.expectOne('/api/v1/users');
    expect(request.request.method).toBe(verb);
    expect(request.request.body).toEqual({ name: 'Ana' });
    request.flush({ id: '1' });
  });

  it('envia DELETE', () => {
    api.delete<void>('/users/1').subscribe();

    const request = http.expectOne('/api/v1/users/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  describe('getPage', () => {
    it('aplica page, size e sort no formato do contrato', () => {
      api
        .getPage<Sample>('/users', { page: 2, size: 50, sort: { field: 'createdAt', direction: 'desc' } })
        .subscribe();

      const request = http.expectOne((candidate) => candidate.url === '/api/v1/users');
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.get('size')).toBe('50');
      expect(request.request.params.get('sort')).toBe('createdAt,desc');
      request.flush(emptyResponse());
    });

    it('aceita sort já no formato string', () => {
      api.getPage<Sample>('/users', { sort: 'name,asc' }).subscribe();

      const request = http.expectOne((candidate) => candidate.url === '/api/v1/users');
      expect(request.request.params.get('sort')).toBe('name,asc');
      request.flush(emptyResponse());
    });

    it('limita size ao máximo e page ao mínimo do contrato (§9.1)', () => {
      api.getPage<Sample>('/users', { page: -5, size: 500 }).subscribe();

      const request = http.expectOne((candidate) => candidate.url === '/api/v1/users');
      expect(request.request.params.get('page')).toBe('0');
      expect(request.request.params.get('size')).toBe('100');
      request.flush(emptyResponse());
    });

    it('repassa filtros e omite os vazios', () => {
      api
        .getPage<Sample>('/users', { role: 'ADMIN', status: 'ACTIVE', name: '', email: null })
        .subscribe();

      const request = http.expectOne((candidate) => candidate.url === '/api/v1/users');
      expect(request.request.params.get('role')).toBe('ADMIN');
      expect(request.request.params.get('status')).toBe('ACTIVE');
      expect(request.request.params.has('name')).toBe(false);
      expect(request.request.params.has('email')).toBe(false);
      request.flush(emptyResponse());
    });

    it('devolve o envelope paginado da API', () => {
      let received: Page<Sample> | undefined;
      api.getPage<Sample>('/users').subscribe((page) => (received = page));

      http.expectOne((candidate) => candidate.url === '/api/v1/users').flush({
        page: 0,
        size: 20,
        totalElements: 137,
        totalPages: 7,
        content: [{ id: '1' }],
      });

      expect(received?.totalElements).toBe(137);
      expect(received?.content).toHaveLength(1);
    });
  });

  describe('multipart', () => {
    it('envia FormData sem definir Content-Type manualmente', () => {
      const file = new File(['conteudo'], 'evidencia.jpg', { type: 'image/jpeg' });

      api
        .postMultipart('/inspections/abc/evidence', {
          idempotencyKey: '5f30d6de-a4e0-4da8-b1c1-2acbd6f2850e',
          type: 'PHOTO',
          capturedAtDevice: new Date('2026-08-01T10:12:30.000Z'),
          file,
        })
        .subscribe();

      const request = http.expectOne('/api/v1/inspections/abc/evidence');
      const body = request.request.body as FormData;

      expect(body).toBeInstanceOf(FormData);
      // O boundary é responsabilidade do navegador — cabeçalho fixo quebraria.
      expect(request.request.headers.has('Content-Type')).toBe(false);
      expect(body.get('type')).toBe('PHOTO');
      expect(body.get('capturedAtDevice')).toBe('2026-08-01T10:12:30.000Z');
      expect(body.get('file')).toBeInstanceOf(File);
      request.flush({ id: 'ev-1' });
    });

    it('pede eventos de progresso no upload', () => {
      api.uploadWithProgress('/inspections/abc/evidence', new FormData()).subscribe();

      const request = http.expectOne('/api/v1/inspections/abc/evidence');
      expect(request.request.reportProgress).toBe(true);
      request.flush({ id: 'ev-1' });
    });
  });
});

describe('buildHttpParams', () => {
  it('serializa Date em ISO 8601', () => {
    const params = buildHttpParams({ scheduledFrom: new Date('2026-08-01T00:00:00.000Z') });
    expect(params.get('scheduledFrom')).toBe('2026-08-01T00:00:00.000Z');
  });

  it('repete a chave para valores em array', () => {
    const params = buildHttpParams({ status: ['SUBMITTED', 'UNDER_REVIEW'] });
    expect(params.getAll('status')).toEqual(['SUBMITTED', 'UNDER_REVIEW']);
  });

  it('mantém booleano e zero, que são filtros válidos', () => {
    const params = buildHttpParams({ overdue: false, page: 0 });
    expect(params.get('overdue')).toBe('false');
    expect(params.get('page')).toBe('0');
  });

  it('omite nulo, indefinido e string vazia', () => {
    const params = buildHttpParams({ a: null, b: undefined, c: '' });
    expect(params.keys()).toHaveLength(0);
  });
});

describe('toFormData', () => {
  it('devolve o próprio FormData quando já recebe um', () => {
    const form = new FormData();
    expect(toFormData(form)).toBe(form);
  });

  it('ignora campos nulos e preserva o nome do arquivo', () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    const form = toFormData({ description: null, file });

    expect(form.has('description')).toBe(false);
    expect((form.get('file') as File).name).toBe('foto.png');
  });
});

function emptyResponse(): Page<Sample> {
  return { page: 0, size: 20, totalElements: 0, totalPages: 0, content: [] };
}
