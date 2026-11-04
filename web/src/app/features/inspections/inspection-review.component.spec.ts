import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { InspectionsService } from '../../core/services/resources';
import { InspectionReviewComponent } from './inspection-review.component';

describe('Revisão — RN-079/080/082', () => {
  function setup(status = 'SUBMITTED', role = 'SUPERVISOR') {
    const service = { get: vi.fn(() => of({ id: 'i1', status })), listEvidence: vi.fn(() => of([])),
      beginReview: vi.fn(() => new Subject()), approve: vi.fn(() => new Subject()), reject: vi.fn(() => new Subject()) };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthStore, useValue: { role: signal(role) } },
      { provide: InspectionsService, useValue: service },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ inspectionId: 'i1' }) } } },
    ] });
    const fixture = TestBed.createComponent(InspectionReviewComponent);
    const component = fixture.componentInstance as unknown as {
      beginReview(): void; approve(): void; reject(): void; decisionComment: ReturnType<typeof signal<string>>;
    };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    return { service, component };
  }
  afterEach(() => vi.restoreAllMocks());
  it('não permite decisão antes de iniciar a revisão', () => {
    const { service, component } = setup();
    component.approve(); component.decisionComment.set('Corrigir'); component.reject();
    expect(service.approve).not.toHaveBeenCalled(); expect(service.reject).not.toHaveBeenCalled();
  });
  it('não inicia novamente uma inspeção já em revisão', () => {
    const { service, component } = setup('UNDER_REVIEW');
    component.beginReview(); expect(service.beginReview).not.toHaveBeenCalled();
  });
  it('não envia duas decisões enquanto a primeira está pendente', () => {
    const { service, component } = setup('UNDER_REVIEW');
    component.approve(); component.approve(); expect(service.approve).toHaveBeenCalledTimes(1);
  });
  it('exige supervisor e justificativa para reprovar', () => {
    const { service, component } = setup('UNDER_REVIEW', 'ADMIN');
    component.beginReview(); component.approve(); component.reject();
    expect(service.beginReview).not.toHaveBeenCalled(); expect(service.approve).not.toHaveBeenCalled(); expect(service.reject).not.toHaveBeenCalled();
  });
  it('não reprova com justificativa vazia', () => {
    const { service, component } = setup('UNDER_REVIEW');
    component.decisionComment.set('   '); component.reject(); expect(service.reject).not.toHaveBeenCalled();
  });
});
