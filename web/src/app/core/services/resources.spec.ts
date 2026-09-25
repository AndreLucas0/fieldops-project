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
import { HttpTemplatesService, TemplatesService } from './resources';

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
