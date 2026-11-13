import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AuthStore } from '../../core';
import {
  ClientsService,
  EquipmentService,
  InspectionsService,
  SitesService,
  TemplatesService,
  UsersService,
} from '../../core/services/resources';
import { InspectionCreateComponent } from './inspection-create.component';
import type { InspectionSite } from '../../core/models/domain';
import { emptyPage, type Page } from '../../core/models/page.model';

interface FormActions {
  onClientChange(id: string): void;
  onSiteChange(id: string): void;
  onTemplateChange(id: string): void;
  submit(): void;
  sites: WritableSignal<InspectionSite[]>;
  templateVersionId: WritableSignal<string>;
  clientId: WritableSignal<string>;
  siteId: WritableSignal<string>;
  technicianId: string;
  scheduledFor: string;
}
describe('Planejamento — integridade do contexto selecionado (RN-025/027)', () => {
  function setup(role = 'SUPERVISOR') {
    const sites = { listByClient: vi.fn(() => of(emptyPage<InspectionSite>())) };
    const templates = { list: () => of(emptyPage()), listVersions: vi.fn(() => of(emptyPage())) };
    const create = vi.fn(() => new Subject());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { role: signal(role), user: () => null } },
        { provide: SitesService, useValue: sites },
        { provide: TemplatesService, useValue: templates },
        { provide: ClientsService, useValue: { list: () => of(emptyPage()) } },
        { provide: UsersService, useValue: { list: () => of(emptyPage()) } },
        { provide: EquipmentService, useValue: { listBySite: () => of(emptyPage()) } },
        { provide: InspectionsService, useValue: { create } },
      ],
    });
    const component = TestBed.createComponent(InspectionCreateComponent)
      .componentInstance as unknown as FormActions;
    return { component, sites, templates, create };
  }
  function fill(component: FormActions) {
    component.templateVersionId.set('v1');
    component.clientId.set('c1');
    component.siteId.set('s1');
    component.technicianId = 'u1';
    component.scheduledFor = '2026-11-05T14:30';
  }
  it('ignora uma resposta de locais de cliente que já foi desmarcado', () => {
    const { component, sites } = setup();
    const first = new Subject<Page<InspectionSite>>();
    const second = new Subject<Page<InspectionSite>>();
    sites.listByClient.mockReturnValueOnce(first).mockReturnValueOnce(second);
    component.onClientChange('c1');
    component.onClientChange('c2');
    second.next({ ...emptyPage(), content: [{ id: 's2', status: 'ACTIVE' } as InspectionSite] });
    first.next({ ...emptyPage(), content: [{ id: 's1', status: 'ACTIVE' } as InspectionSite] });
    expect(component.sites().map((site) => site.id)).toEqual(['s2']);
  });
  it('não envia o planejamento duas vezes durante o salvamento', () => {
    const { component, create } = setup();
    fill(component);
    component.submit();
    component.submit();
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('preserva o horário escolhido no contrato ISO', () => {
    const { component, create } = setup();
    fill(component);
    component.submit();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledFor: new Date('2026-11-05T14:30').toISOString() }),
    );
  });
  it('não lança exceção nem envia uma data inválida', () => {
    const { component, create } = setup();
    fill(component);
    component.scheduledFor = 'inválida';
    expect(() => component.submit()).not.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it('técnico não envia agendamento por invocação direta', () => {
    const { component, create } = setup('TECHNICIAN');
    fill(component);
    component.submit();
    expect(create).not.toHaveBeenCalled();
  });
});
