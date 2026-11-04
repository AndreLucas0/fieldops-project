import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { TemplatesService } from '../../core/services/resources';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TemplatePreviewComponent } from './template-preview.component';

describe('FE-W16 — prévia e publicação', () => {
  function setup(status = 'DRAFT', sections: unknown[] = []) {
    const service = {
      get: vi.fn(() => of({ id: 't1', title: 'Checklist', status })),
      listDraftSections: vi.fn(() => of(sections)),
      listVersions: vi.fn(() => of({ content: [{ id: 'v1' }] })),
      getVersion: vi.fn(() => of({ templateId: 't1', sections })),
      publish: vi.fn(() => of({ id: 'v2' })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TemplatesService, useValue: service },
        { provide: ConfirmDialogService, useValue: { open: () => of({ confirmed: false }) } },
      ],
    });
    TestBed.inject(AuthStore).setSession({
      accessToken: 't',
      refreshToken: 'r',
      expiresAt: Date.now() + 60000,
      user: { id: 'u', name: 'S', email: 's@test.local', role: 'SUPERVISOR' },
    });
    const fixture = TestBed.createComponent(TemplatePreviewComponent);
    fixture.componentRef.setInput('templateId', 't1');
    fixture.detectChanges();
    return { fixture, service, component: fixture.componentInstance };
  }
  it('não permite publicar um rascunho sem itens (RN-015)', () => {
    const { component, service } = setup();
    component.publish();
    expect(service.publish).not.toHaveBeenCalled();
  });
  it('lê o snapshot publicado em vez de consultar um rascunho inexistente (RN-019)', () => {
    const { service } = setup('ACTIVE');
    expect(service.getVersion).toHaveBeenCalledWith('v1');
    expect(service.listDraftSections).not.toHaveBeenCalled();
  });
  it('não publica quando a confirmação é cancelada', () => {
    const { component, service } = setup('DRAFT', [
      {
        id: 's1',
        title: 'Segurança',
        displayOrder: 1,
        items: [{ id: 'i1', title: 'Verificar', responseType: 'TEXT_SHORT', displayOrder: 1 }],
      },
    ]);
    component.publish();
    expect(service.publish).not.toHaveBeenCalled();
  });
  it('renderiza alternativas com value/label já usadas no mobile, sem mostrar JSON', () => {
    const { fixture } = setup('DRAFT', [
      {
        id: 's1',
        title: 'Painéis',
        displayOrder: 1,
        items: [
          {
            id: 'i1',
            title: 'Proteção',
            displayOrder: 1,
            responseType: 'SINGLE_CHOICE',
            optionsJson: {
              options: [
                { value: 'IP54', label: 'Proteção IP54' },
                { value: 'IP65', label: 'Proteção IP65' },
              ],
            },
          },
        ],
      },
    ]);
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Proteção IP54');
    expect(text).toContain('Proteção IP65');
    expect(text).not.toContain('"options"');
  });
});
