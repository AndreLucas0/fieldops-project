import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { resetMockStore } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { ClientsService } from '../../core/services/resources';
import { ClientsListComponent } from './clients-list.component';

describe('ClientsListComponent', () => {
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

  it('carrega os clientes e mostra estado e campos principais', async () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Clientes');
    expect(text).toContain('Cliente');
    expect(text).toContain('Situação');
    expect(text).toContain('Ativo');
  });

  it('envia busca ao serviço e reinicia a página quando o filtro muda', async () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const service = TestBed.inject(ClientsService);
    const list = vi.spyOn(service, 'list');

    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    input.value = 'Acme';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Acme', page: 0 }));
  });
});
