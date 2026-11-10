import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { resetMockStore } from '@fieldops/shared';
import { AuthStore } from '../../core/auth/auth.store';
import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { TemplatesService } from '../../core/services/resources';
import { TemplateCreateComponent } from './template-create.component';

describe('FE-W14 — novo modelo', () => {
  function setup(role: 'SUPERVISOR' | 'TECHNICIAN' = 'SUPERVISOR') {
    resetMockStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
      ],
    });
    TestBed.inject(AuthStore).setSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60000,
      user: { id: 'user-1', name: 'Lucas', email: 'lucas@example.test', role },
    });
    const fixture = TestBed.createComponent(TemplateCreateComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    return {
      fixture,
      component,
      create: vi.spyOn(TestBed.inject(TemplatesService), 'create'),
      navigate: vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true),
    };
  }
  it('não cria sem título e categoria (RN-015)', () => {
    const { component, create } = setup();
    component.submit();
    expect(create).not.toHaveBeenCalled();
  });
  it('cria DRAFT e abre o construtor sem inventar seções', () => {
    const { component, create, navigate } = setup();
    component.form.setValue({ title: '  Checklist  ', category: ' Operação ', description: '' });
    component.submit();
    expect(create).toHaveBeenCalledWith({
      title: 'Checklist',
      category: 'Operação',
      description: null,
    });
    expect(navigate).toHaveBeenCalledWith(['/inspection-templates', expect.any(String), 'edit']);
  });
  it('não permite criação por técnico', () => {
    const { component, create } = setup('TECHNICIAN');
    component.form.setValue({ title: 'Checklist', category: 'Operação', description: '' });
    component.submit();
    expect(create).not.toHaveBeenCalled();
  });
});
