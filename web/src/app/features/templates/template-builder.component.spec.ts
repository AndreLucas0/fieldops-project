import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';

import { resetMockStore, TEMPLATE_IDS } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { AuthStore } from '../../core/auth/auth.store';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { TemplatesService } from '../../core/services/resources';
import { TemplateBuilderComponent } from './template-builder.component';
import { TemplateSectionFormDialogService } from './template-section-form-dialog.component';
import { TemplateItemFormDialogService } from './template-item-form-dialog.component';

/**
 * FE-W15 — Construtor de modelo (TS-10-10).
 *
 * "Checklist Elétrico" (DRAFT) é o modelo editável do conjunto fictício, com
 * uma seção ("Painéis") e dois itens: um `CONFORMITY` obrigatório e um
 * `SINGLE_CHOICE` opcional. "Inspeção de Segurança" (ACTIVE) serve para
 * testar o bloqueio de edição fora de rascunho (RN-018).
 *
 * Os diálogos de seção/item (TS-10-11) são substituídos por fakes: o que
 * importa aqui é que a tela chama o serviço certo com o resultado do
 * diálogo, não o comportamento interno do formulário (coberto à parte).
 */
describe('TemplateBuilderComponent', () => {
  function setup(
    templateId: string,
    options: {
      role?: 'ADMIN' | 'SUPERVISOR' | null;
      sectionDialogResult?: unknown;
      itemDialogResult?: unknown;
    } = {},
  ) {
    resetMockStore();
    const { role = 'SUPERVISOR', sectionDialogResult, itemDialogResult } = options;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        {
          provide: TemplateSectionFormDialogService,
          useValue: { open: () => of(sectionDialogResult) },
        },
        { provide: TemplateItemFormDialogService, useValue: { open: () => of(itemDialogResult) } },
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

    const fixture = TestBed.createComponent(TemplateBuilderComponent);
    fixture.componentRef.setInput('templateId', templateId);
    fixture.detectChanges();
    return fixture;
  }

  function texto(fixture: ReturnType<typeof setup>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('carrega os dados gerais e a árvore de seções/itens do rascunho', () => {
    const fixture = setup(TEMPLATE_IDS.eletrico);
    const conteudo = texto(fixture);

    expect(conteudo).toContain('Checklist Elétrico');
    expect(conteudo).toContain('Painéis');
    expect(conteudo).toContain('Painel está aterrado corretamente?');
    expect(conteudo).toContain('Conformidade');
    expect(conteudo).toContain('Obrigatório');
    expect(conteudo).toContain('Classe de proteção do painel');
    expect(conteudo).toContain('Seleção única');
  });

  it('modelo ACTIVE mostra o aviso de bloqueio e esconde as ações de edição', () => {
    const fixture = setup(TEMPLATE_IDS.seguranca);
    const conteudo = texto(fixture);

    expect(conteudo).toContain('não podem ser editados aqui');
    expect(conteudo).not.toContain('Nova seção');
  });

  it('sem permissão de escrita, as ações de edição ficam escondidas mesmo em modelo DRAFT', () => {
    const fixture = setup(TEMPLATE_IDS.eletrico, { role: null });
    expect(texto(fixture)).not.toContain('Nova seção');
  });

  it('criar seção chama o serviço e a nova seção aparece na lista', () => {
    const fixture = setup(TEMPLATE_IDS.eletrico, {
      sectionDialogResult: { title: 'Aterramento', description: null },
    });
    const templates = TestBed.inject(TemplatesService);
    const createSection = vi.spyOn(templates, 'createSection');

    const botao = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el) => el.textContent?.includes('Nova seção'))!;
    botao.click();
    fixture.detectChanges();

    expect(createSection).toHaveBeenCalledWith(
      TEMPLATE_IDS.eletrico,
      expect.objectContaining({ title: 'Aterramento' }),
    );
    expect(texto(fixture)).toContain('Aterramento');
  });

  it('criar item chama o serviço com o templateId e a seção certos', () => {
    const fixture = setup(TEMPLATE_IDS.eletrico, {
      itemDialogResult: {
        code: null,
        title: 'Disjuntor calibrado?',
        description: null,
        responseType: 'BOOLEAN',
        required: true,
        observationRequiredOnFailure: false,
        evidenceRequiredOnFailure: false,
        optionsJson: null,
      },
    });
    const templates = TestBed.inject(TemplatesService);
    const createItem = vi.spyOn(templates, 'createItem');

    const botao = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el) => el.textContent?.includes('Novo item'))!;
    botao.click();
    fixture.detectChanges();

    expect(createItem).toHaveBeenCalledWith(
      TEMPLATE_IDS.eletrico,
      expect.any(String),
      expect.objectContaining({ title: 'Disjuntor calibrado?', responseType: 'BOOLEAN' }),
    );
    expect(texto(fixture)).toContain('Disjuntor calibrado?');
  });

  it('modelo inexistente mostra o erro com botão de nova tentativa', () => {
    const fixture = setup('id-que-nao-existe');
    expect(texto(fixture)).toContain('Tentar novamente');
  });

  it('salvar dados gerais só habilita depois de uma alteração real', () => {
    const fixture = setup(TEMPLATE_IDS.eletrico);
    const botaoSalvar = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((el) =>
        el.textContent?.includes('Salvar dados gerais'),
      )!;

    expect(botaoSalvar().disabled).toBe(true);

    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input[matInput]',
    ) as HTMLInputElement;
    input.value = 'Checklist Elétrico revisado';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(botaoSalvar().disabled).toBe(false);
  });
});