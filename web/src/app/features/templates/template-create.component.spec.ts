import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { resetMockStore } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { TemplatesService } from '../../core/services/resources';
import { TemplateCreateComponent } from './template-create.component';

describe('TemplateCreateComponent', () => {
  beforeEach(() => {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
      ],
    });
  });

  it('creates a draft and opens its builder', () => {
    const fixture = TestBed.createComponent(TemplateCreateComponent);
    const templates = TestBed.inject(TemplatesService);
    const create = vi.spyOn(templates, 'create');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const title = root.querySelector<HTMLInputElement>('input[name="title"]')!;
    const category = root.querySelector<HTMLInputElement>('input[name="category"]')!;
    title.value = 'Checklist de bombas';
    category.value = 'Mecânica';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    category.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    root.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(create).toHaveBeenCalledWith({
      title: 'Checklist de bombas',
      category: 'Mecânica',
      description: null,
    });
    expect(navigate).toHaveBeenCalledWith(['/inspection-templates', expect.any(String), 'edit']);
  });
});
