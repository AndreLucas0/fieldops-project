import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { ApiError } from '../../core/models/api-error.model';
import { provideResources } from '../../core/core.providers';
import { AuthStore } from '../../core/auth/auth.store';
import { TemplatesService } from '../../core/services/resources';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { TemplatesListComponent } from './templates-list.component';

/**
 * FE-W13 — Modelos de inspeção (lista).
 *
 * O conjunto fictício traz dois modelos: um ativo, publicado (Inspeção de
 * Segurança) e um em rascunho, sem versão (Checklist Elétrico).
 */
describe('TemplatesListComponent', () => {
  function setup(
    extraProviders: unknown[] = [],
    role: 'ADMIN' | 'SUPERVISOR' | null = 'SUPERVISOR',
  ) {
    resetMockStore();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        ...(extraProviders as never[]),
      ],
    });

    if (role) {
      const auth = TestBed.inject(AuthStore);
      auth.setSession({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60_000,
        user: { id: 'user-1', name: 'Teste', email: 'teste@fieldops.local', role },
      });
    }

    const fixture = TestBed.createComponent(TemplatesListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function texto(fixture: ReturnType<typeof setup>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('lista os modelos do conjunto fictício com título, categoria e situação', () => {
    const fixture = setup();
    const conteudo = texto(fixture);

    expect(conteudo).toContain('Inspeção de Segurança');
    expect(conteudo).toContain('Checklist Elétrico');
    expect(conteudo).toContain('Ativo');
    expect(conteudo).toContain('Rascunho');
  });

  it('o título de cada linha aponta para o detalhe do modelo', () => {
    const fixture = setup();
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find(
      (el) => el.textContent?.includes('Inspeção de Segurança'),
    )!;

    expect(link.getAttribute('href')).toMatch(/^\/inspection-templates\//);
  });

  it('modelo sem versão publicada mostra o texto de vazio na coluna de versão', () => {
    const fixture = setup();
    expect(texto(fixture)).toContain('Nenhuma publicada');
  });

  it('SUPERVISOR vê o botão "Novo modelo"', () => {
    const fixture = setup();
    expect(texto(fixture)).toContain('Novo modelo');
  });

  it('sem sessão, o botão "Novo modelo" não aparece', () => {
    const fixture = setup([], null);
    expect(texto(fixture)).not.toContain('Novo modelo');
  });

  it('filtrar por categoria envia o filtro para o serviço e atualiza a etiqueta ativa', () => {
    const fixture = setup();
    const templates = TestBed.inject(TemplatesService);
    const list = vi.spyOn(templates, 'list');

    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input[matInput]',
    ) as HTMLInputElement;
    input.value = 'SEGURANCA';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ category: 'SEGURANCA', page: 0 }));
    expect(texto(fixture)).toContain('Categoria: SEGURANCA');
  });

  describe('estados de carga', () => {
    it('mostra o esqueleto enquanto a busca não volta', () => {
      const fixture = setup([{ provide: MOCK_LATENCY_MS, useValue: 10_000 }]);

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('app-loading-state'),
      ).not.toBeNull();
    });

    it('mostra o erro com botão de nova tentativa quando a busca falha', () => {
      const falha = {
        list: () =>
          throwError(
            () =>
              new ApiError({
                kind: 'SERVER_ERROR',
                status: 500,
                code: 'SERVER_ERROR',
                userMessage: 'Erro interno. Tente novamente em instantes.',
              }),
          ),
      };

      const fixture = setup([{ provide: TemplatesService, useValue: falha }]);

      expect(texto(fixture)).toContain('Erro interno');
      expect(texto(fixture)).toContain('Tentar novamente');
    });

    it('sem resultados, mostra o estado vazio pedindo para ajustar os filtros', () => {
      const fixture = setup([
        {
          provide: TemplatesService,
          useValue: {
            list: () => of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }),
          },
        },
      ]);

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('app-empty-state'),
      ).not.toBeNull();
      expect(texto(fixture)).toContain('Ainda não há modelos de inspeção cadastrados');
    });
  });
});