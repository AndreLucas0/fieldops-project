import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { TemplatesService } from '../../core/services/resources';
import { TemplateVersionsComponent } from './template-versions.component';

describe('FE-W17 — versões publicadas', () => {
  it('pagina no servidor e abre o snapshot da versão selecionada', () => {
    const service = {
      get: () => of({ title: 'Checklist' }),
      listVersions: vi.fn(() =>
        of({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TemplatesService, useValue: service }],
    });
    const fixture = TestBed.createComponent(TemplateVersionsComponent);
    fixture.componentRef.setInput('templateId', 't1');
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.onPage({ page: 2, size: 20 });
    expect(service.listVersions).toHaveBeenLastCalledWith(
      't1',
      expect.objectContaining({ page: 2, size: 20 }),
    );
    fixture.componentInstance.openVersion('v1');
    expect(navigate).toHaveBeenCalledWith(['/inspection-templates', 't1', 'preview'], {
      queryParams: { versionId: 'v1' },
    });
  });
});
