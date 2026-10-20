/**
 * INT-001 — Verifica que HttpTemplatesService utiliza os endpoints reais do backend.
 *
 * O backend implementa `/templates` (não `/inspection-templates`).
 * Os testes confirmam o método HTTP e o caminho exato para cada operação
 * que existe no controller.
 */
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { InspectionTemplate } from '../models/domain';
import { firstValueFrom } from 'rxjs';

import {
  EquipmentService,
  HttpEquipmentService,
  HttpSitesService,
  HttpTemplatesService,
  SitesService,
  TemplatesService,
} from './resources';

const FAKE_TEMPLATE: InspectionTemplate = {
  id: 'tpl-1',
  title: 'Inspeção de Segurança',
  category: 'Segurança',
  status: 'ACTIVE',
  currentVersion: 2,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  version: 1,
};

const FAKE_PAGE = {
  content: [FAKE_TEMPLATE],
  totalElements: 1,
  totalPages: 1,
  page: 0,
  size: 20,
};

describe('HttpTemplatesService — contratos HTTP', () => {
  let service: TemplatesService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        { provide: TemplatesService, useClass: HttpTemplatesService },
      ],
    });
    service = TestBed.inject(TemplatesService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('list()', () => {
    it('emite GET para /api/v1/templates', () => {
      service.list().subscribe();

      const req = backend.expectOne((r) => r.url === '/api/v1/templates');
      expect(req.request.method).toBe('GET');
      req.flush(FAKE_PAGE);
    });

    it('encaminha os filtros como query params', () => {
      service.list({ category: 'Segurança', status: 'ACTIVE' }).subscribe();

      const req = backend.expectOne((r) => r.url === '/api/v1/templates');
      expect(req.request.params.get('category')).toBe('Segurança');
      expect(req.request.params.get('status')).toBe('ACTIVE');
      req.flush(FAKE_PAGE);
    });
  });

  describe('get(id)', () => {
    it('emite GET para /api/v1/templates/{id}', () => {
      service.get('tpl-1').subscribe();

      const req = backend.expectOne('/api/v1/templates/tpl-1');
      expect(req.request.method).toBe('GET');
      req.flush(FAKE_TEMPLATE);
    });
  });
});

/**
 * Endpoints aninhados e de versões devolvem `PageResponse`, não array.
 *
 * Evidência no backend:
 * - `ClientController.listClientSites` → `PageResponse<SiteResponse>`
 * - `SiteController.listSiteEquipment` → `PageResponse<EquipmentResponse>`
 * - `TemplateController` `GET /{id}/versions` → `PageResponse<...>`
 *
 * Os serviços declaravam `Observable<X[]>` e iteravam o envelope direto.
 */
describe('Endpoints aninhados — envelope paginado', () => {
  let backend: HttpTestingController;

  function setup<T>(token: abstract new (...args: never[]) => T, impl: new () => T): T {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        { provide: token, useClass: impl },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    return TestBed.inject(token as never) as T;
  }

  afterEach(() => backend.verify());

  it('listByClient devolve a página de locais do cliente', async () => {
    const service = setup(SitesService, HttpSitesService);
    const promise = firstValueFrom(service.listByClient('cli-1'));

    const req = backend.expectOne((r) => r.url === '/api/v1/clients/cli-1/sites');
    expect(req.request.method).toBe('GET');
    req.flush({ content: [{ id: 'site-1' }], totalElements: 1, totalPages: 1, page: 0, size: 20 });

    const page = await promise;
    expect(page.content).toHaveLength(1);
    expect(page.totalElements).toBe(1);
  });

  it('listBySite devolve a página de equipamentos do local', async () => {
    const service = setup(EquipmentService, HttpEquipmentService);
    const promise = firstValueFrom(service.listBySite('site-1'));

    const req = backend.expectOne((r) => r.url === '/api/v1/sites/site-1/equipment');
    expect(req.request.method).toBe('GET');
    req.flush({ content: [{ id: 'eq-1' }], totalElements: 1, totalPages: 1, page: 0, size: 20 });

    const page = await promise;
    expect(page.content).toHaveLength(1);
  });

  it('listVersions devolve a página de versões do modelo', async () => {
    const service = setup(TemplatesService, HttpTemplatesService);
    const promise = firstValueFrom(service.listVersions('tpl-1'));

    const req = backend.expectOne((r) => r.url === '/api/v1/inspection-templates/tpl-1/versions');
    expect(req.request.method).toBe('GET');
    req.flush({ content: [{ id: 'ver-1' }], totalElements: 1, totalPages: 1, page: 0, size: 20 });

    const page = await promise;
    expect(page.content).toHaveLength(1);
  });
});
