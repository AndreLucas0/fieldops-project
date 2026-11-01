import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { CatalogListComponent } from './catalog-list.component';

describe('CatalogListComponent', () => {
  async function render(catalog: string): Promise<string> {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        {
          provide: ActivatedRoute,
          useValue: { data: of({ catalog }), snapshot: { data: { catalog } } },
        },
      ],
    });
    const fixture = TestBed.createComponent(CatalogListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('apresenta a lista de usuários com perfil e situação', async () => {
    const text = await render('users');
    expect(text).toContain('Usuários');
    expect(text).toContain('Perfil');
    expect(text).toContain('Situação');
  });

  it('apresenta locais com cliente, cidade e estado', async () => {
    const text = await render('sites');
    expect(text).toContain('Locais');
    expect(text).toContain('Cliente');
    expect(text).toContain('Cidade');
  });

  it('apresenta equipamentos com identificadores e situação', async () => {
    const text = await render('equipment');
    expect(text).toContain('Equipamentos');
    expect(text).toContain('Patrimônio');
    expect(text).toContain('Nº de série');
  });

  it('filtra não conformidades por criticidade', async () => {
    const text = await render('non-conformities');
    expect(text).toContain('Não conformidades');
    expect(text).toContain('Criticidade');
  });
});
