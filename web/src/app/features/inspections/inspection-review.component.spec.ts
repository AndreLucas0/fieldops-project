import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { InspectionsService } from '../../core/services/resources';
import { InspectionReviewComponent } from './inspection-review.component';
import { ConfirmDialogService } from '../../shared/components';

describe('Revisão — RN-079/080/082', () => {
  function setup(status = 'SUBMITTED', role = 'SUPERVISOR') {
    const confirm = { open: vi.fn(() => of({ confirmed: true })) };
    const service = {
      get: vi.fn(() => of({ id: 'i1', status })),
      listEvidence: vi.fn(() => of([])),
      beginReview: vi.fn(() => new Subject()),
      approve: vi.fn(() => new Subject()),
      reject: vi.fn(() => new Subject()),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfirmDialogService, useValue: confirm },
        { provide: AuthStore, useValue: { role: signal(role) } },
        { provide: InspectionsService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ inspectionId: 'i1' }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(InspectionReviewComponent);
    const component = fixture.componentInstance as unknown as {
      beginReview(): void;
      approve(): void;
      reject(): void;
      decisionComment: ReturnType<typeof signal<string>>;
    };
    return { service, component, fixture, confirm };
  }
  afterEach(() => vi.restoreAllMocks());

  it('mantém o acionador habilitado para restaurar foco e impede confirmações duplicadas', () => {
    const { service, component, fixture, confirm } = setup('UNDER_REVIEW');
    const decision = new Subject<{ confirmed: boolean }>();
    confirm.open.mockReturnValue(decision as never);
    component.approve();
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.find((button) => button.textContent?.trim() === 'Aprovar')?.disabled).toBe(
      false,
    );
    component.approve();
    expect(confirm.open).toHaveBeenCalledTimes(1);
    decision.next({ confirmed: false });
    decision.complete();
    expect(service.approve).not.toHaveBeenCalled();
  });

  it('não decide quando a confirmação padrão do projeto é cancelada', () => {
    const { service, component, confirm } = setup('UNDER_REVIEW');
    confirm.open.mockReturnValue(of({ confirmed: false }));
    component.approve();
    expect(service.approve).not.toHaveBeenCalled();
  });

  it('mostra conformidade registrada sem dizer que a resposta está vazia', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance as unknown as {
      inspection: { set(value: unknown): void };
    };
    component.inspection.set({
      id: 'i1',
      status: 'SUBMITTED',
      items: [{ id: 'item1', itemTitle: 'Proteção', sectionTitle: 'Segurança', required: true }],
      responses: [{ inspectionItemId: 'item1', conformity: 'CONFORMING' }],
    });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Conforme');
    expect(text).not.toContain('Resposta sem valor informado');
  });

  it('continua bloqueando novo envio enquanto atualiza os dados após a transição', () => {
    const { service, component } = setup();
    const refresh = new Subject();
    service.get.mockReturnValueOnce(refresh as never);
    component.beginReview();
    const transition = service.beginReview.mock.results[0].value;
    transition.next({});
    transition.complete();
    component.beginReview();
    expect(service.beginReview).toHaveBeenCalledTimes(1);
  });
  it('não permite decisão antes de iniciar a revisão', () => {
    const { service, component } = setup();
    component.approve();
    component.decisionComment.set('Corrigir');
    component.reject();
    expect(service.approve).not.toHaveBeenCalled();
    expect(service.reject).not.toHaveBeenCalled();
  });
  it('não inicia novamente uma inspeção já em revisão', () => {
    const { service, component } = setup('UNDER_REVIEW');
    component.beginReview();
    expect(service.beginReview).not.toHaveBeenCalled();
  });
  it('não envia duas decisões enquanto a primeira está pendente', () => {
    const { service, component } = setup('UNDER_REVIEW');
    component.approve();
    component.approve();
    expect(service.approve).toHaveBeenCalledTimes(1);
  });
  it('exige supervisor e justificativa para reprovar', () => {
    const { service, component } = setup('UNDER_REVIEW', 'ADMIN');
    component.beginReview();
    component.approve();
    component.reject();
    expect(service.beginReview).not.toHaveBeenCalled();
    expect(service.approve).not.toHaveBeenCalled();
    expect(service.reject).not.toHaveBeenCalled();
  });
  it('não reprova com justificativa vazia', () => {
    const { service, component } = setup('UNDER_REVIEW');
    component.decisionComment.set('   ');
    component.reject();
    expect(service.reject).not.toHaveBeenCalled();
  });
});
