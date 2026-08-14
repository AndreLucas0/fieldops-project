import { TestBed } from '@angular/core/testing';

import { StatusBadgeComponent } from './status-badge.component';
import { describeStatus, statusLabel, statusOptions } from './status-catalog';

describe('describeStatus', () => {
  it('traduz os estados de inspeção conforme telas-frontend.md §17.1', () => {
    expect(describeStatus('inspection', 'IN_PROGRESS')).toEqual({
      label: 'Em andamento',
      tone: 'yellow',
    });
    expect(describeStatus('inspection', 'APPROVED')).toEqual({ label: 'Aprovada', tone: 'green' });
    expect(describeStatus('inspection', 'CANCELED')).toEqual({
      label: 'Cancelada',
      tone: 'gray-dark',
    });
  });

  it('usa a mesma escala de cor para prioridade e severidade', () => {
    for (const value of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      expect(describeStatus('priority', value)).toEqual(describeStatus('severity', value));
    }
    expect(describeStatus('priority', 'CRITICAL').tone).toBe('red');
  });

  it('distingue equipamento baixado de inativo', () => {
    expect(describeStatus('equipment', 'INACTIVE')).toEqual({ label: 'Inativo', tone: 'gray' });
    expect(describeStatus('equipment', 'DECOMMISSIONED')).toEqual({
      label: 'Baixado',
      tone: 'red-dark',
    });
  });

  it('exibe valor desconhecido como veio, sem quebrar a listagem', () => {
    expect(describeStatus('inspection', 'ESTADO_NOVO')).toEqual({
      label: 'ESTADO_NOVO',
      tone: 'gray',
    });
  });

  it('trata ausência de valor como travessão', () => {
    expect(describeStatus('conformity', null).label).toBe('—');
    expect(describeStatus('conformity', undefined).label).toBe('—');
    expect(describeStatus('conformity', '').label).toBe('—');
  });
});

describe('statusOptions', () => {
  it('devolve todos os valores do contexto para alimentar filtros', () => {
    const options = statusOptions('inspection');

    expect(options).toHaveLength(8);
    expect(options[0]).toEqual({ value: 'DRAFT', label: 'Rascunho', tone: 'gray' });
  });
});

describe('statusLabel', () => {
  it('devolve só o rótulo, para uso fora da etiqueta', () => {
    expect(statusLabel('user', 'BLOCKED')).toBe('Bloqueado');
  });
});

describe('StatusBadgeComponent', () => {
  async function render(value: string | null, context: 'inspection' | 'conformity') {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('context', context);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renderiza rótulo e classe de cor', async () => {
    const element = await render('REJECTED', 'inspection');
    const badge = element.querySelector('span');

    expect(badge?.textContent?.trim()).toBe('Reprovada');
    expect(badge?.className).toContain('tone-red');
    expect(badge?.className).toContain('fo-badge');
  });

  it('acompanha a troca de valor', async () => {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('value', 'CONFORMING');
    fixture.componentRef.setInput('context', 'conformity');
    await fixture.whenStable();

    fixture.componentRef.setInput('value', 'NON_CONFORMING');
    await fixture.whenStable();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('span');
    expect(badge?.textContent?.trim()).toBe('Não conforme');
    expect(badge?.className).toContain('tone-red');
  });
});
