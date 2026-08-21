import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ApiError, type Page } from '../../../core';
import { DataTableComponent } from './data-table.component';
import { resolveFieldValue, type ActiveFilter, type TableColumn } from './data-table.model';

interface Row {
  id: string;
  name: string;
  status: string;
  scheduledFor: string;
  site: { name: string };
}

const COLUMNS: TableColumn<Row>[] = [
  { field: 'name', label: 'Título', type: 'link', link: (row) => ['/inspections', row.id] },
  { field: 'site.name', label: 'Local' },
  { field: 'status', label: 'Situação', type: 'badge', badgeContext: 'inspection' },
  { field: 'scheduledFor', label: 'Agendada para', type: 'date', sortable: true },
  {
    field: 'actions',
    label: '',
    type: 'actions',
    actions: [
      { id: 'edit', label: 'Editar' },
      {
        id: 'cancel',
        label: 'Cancelar',
        danger: true,
        visible: (row) => row.status !== 'CANCELED',
      },
    ],
  },
];

function buildPage(rows: Row[]): Page<Row> {
  return { content: rows, totalElements: 42, totalPages: 3, page: 1, size: 20 };
}

const ROWS: Row[] = [
  {
    id: 'i-1',
    name: 'Preventiva CP-100',
    status: 'IN_PROGRESS',
    // Sem fuso: o formato é comparado em horário local, sem depender da máquina.
    scheduledFor: '2026-08-14T13:45:00',
    site: { name: 'Unidade Norte' },
  },
  {
    id: 'i-2',
    name: 'Preventiva PR-02',
    status: 'CANCELED',
    scheduledFor: '2026-08-15T08:00:00',
    site: { name: 'Unidade Sul' },
  },
];

describe('resolveFieldValue', () => {
  it('lê caminho com ponto', () => {
    expect(resolveFieldValue(ROWS[0], 'site.name')).toBe('Unidade Norte');
  });

  it('devolve undefined em caminho inexistente, sem lançar', () => {
    expect(resolveFieldValue(ROWS[0], 'site.city.zip')).toBeUndefined();
    expect(resolveFieldValue(null, 'qualquer')).toBeUndefined();
  });
});

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<DataTableComponent<Row>>;

  async function render(inputs: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent<DataTableComponent<Row>>(DataTableComponent);
    fixture.componentRef.setInput('columns', COLUMNS);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('mostra esqueleto enquanto carrega', async () => {
    const element = await render({ loading: true });

    expect(element.querySelector('app-loading-state')).not.toBeNull();
    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('mat-paginator')).toBeNull();
  });

  it('mostra estado vazio quando a página não tem conteúdo', async () => {
    const element = await render({
      data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 },
      emptyTitle: 'Nenhuma inspeção',
      emptyActionLabel: 'Agendar inspeção',
    });

    expect(element.querySelector('app-empty-state')?.textContent).toContain('Nenhuma inspeção');
    expect(element.querySelector('table')).toBeNull();
  });

  it('emite a ação do estado vazio', async () => {
    const element = await render({
      data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 },
      emptyActionLabel: 'Agendar inspeção',
    });

    const emitted: unknown[] = [];
    fixture.componentInstance.emptyAction.subscribe(() => emitted.push('clicado'));

    element.querySelector<HTMLButtonElement>('app-empty-state button')?.click();
    await fixture.whenStable();

    expect(emitted).toHaveLength(1);
  });

  it('mostra o erro com mensagem, identificador e botão de nova tentativa', async () => {
    const error = new ApiError({
      kind: 'SERVER_ERROR',
      status: 500,
      code: 'INTERNAL',
      userMessage: 'Erro interno.',
      requestId: 'req-123',
    });

    const element = await render({ data: buildPage(ROWS), error });

    expect(element.querySelector('.fo-table__error-message')?.textContent).toContain(
      'Erro interno.',
    );
    expect(element.querySelector('.fo-table__error-id')?.textContent).toContain('req-123');
    // O erro substitui a tabela, mesmo havendo dados da busca anterior.
    expect(element.querySelector('table')).toBeNull();

    const emitted: unknown[] = [];
    fixture.componentInstance.retry.subscribe(() => emitted.push('retry'));
    element.querySelector<HTMLButtonElement>('.fo-table__error button')?.click();
    await fixture.whenStable();

    expect(emitted).toHaveLength(1);
  });

  it('o erro tem precedência sobre o carregamento', async () => {
    const error = new ApiError({
      kind: 'NETWORK',
      status: 0,
      code: 'NETWORK',
      userMessage: 'Sem conexão.',
    });

    const element = await render({ loading: true, error });

    expect(element.querySelector('app-loading-state')).toBeNull();
    expect(element.querySelector('.fo-table__error')).not.toBeNull();
  });

  it('renderiza as células conforme o tipo da coluna', async () => {
    const element = await render({ data: buildPage(ROWS) });

    const firstRow = element.querySelectorAll('tbody tr')[0];
    const cells = firstRow?.querySelectorAll('td') ?? [];

    expect(cells[0]?.querySelector('a')?.getAttribute('href')).toBe('/inspections/i-1');
    expect(cells[1]?.textContent?.trim()).toBe('Unidade Norte');
    expect(cells[2]?.querySelector('app-status-badge')?.textContent?.trim()).toBe('Em andamento');
    expect(cells[3]?.textContent?.trim()).toBe('14/08/2026 13:45');
  });

  it('oculta a ação marcada como invisível para a linha', async () => {
    const element = await render({ data: buildPage(ROWS) });
    const rows = element.querySelectorAll('tbody tr');

    // A segunda inspeção está cancelada: "Cancelar" não deve aparecer.
    rows[1]?.querySelector<HTMLButtonElement>('button[mat-menu-trigger-for], button')?.click();
    await fixture.whenStable();

    const menuItems = Array.from(document.querySelectorAll('button[mat-menu-item]')).map((item) =>
      item.textContent?.trim(),
    );
    expect(menuItems).toContain('Editar');
    expect(menuItems).not.toContain('Cancelar');
  });

  it('emite rowAction com a ação e a linha', async () => {
    const element = await render({ data: buildPage(ROWS) });

    const events: { action: string; row: Row }[] = [];
    fixture.componentInstance.rowAction.subscribe((event) => events.push(event));

    element.querySelectorAll('tbody tr')[0]?.querySelector<HTMLButtonElement>('button')?.click();
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('button[mat-menu-item]')?.click();
    await fixture.whenStable();

    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe('edit');
    expect(events[0]?.row.id).toBe('i-1');
  });

  it('emite pageChange com índice e tamanho pedidos', async () => {
    const element = await render({ data: buildPage(ROWS) });

    const events: unknown[] = [];
    fixture.componentInstance.pageChange.subscribe((event) => events.push(event));

    element
      .querySelector<HTMLButtonElement>('mat-paginator button.mat-mdc-paginator-navigation-next')
      ?.click();
    await fixture.whenStable();

    expect(events[0]).toEqual({ page: 2, size: 20 });
  });

  it('emite sortChange ao clicar no cabeçalho ordenável', async () => {
    const element = await render({ data: buildPage(ROWS) });

    const events: unknown[] = [];
    fixture.componentInstance.sortChange.subscribe((event) => events.push(event));

    const headers = element.querySelectorAll<HTMLElement>('th');
    headers[3]?.click();
    await fixture.whenStable();

    expect(events[0]).toEqual({ field: 'scheduledFor', direction: 'asc' });
  });

  it('não ordena por coluna sem sortable', async () => {
    const element = await render({ data: buildPage(ROWS) });

    const events: unknown[] = [];
    fixture.componentInstance.sortChange.subscribe((event) => events.push(event));

    element.querySelectorAll<HTMLElement>('th')[1]?.click();
    await fixture.whenStable();

    expect(events).toHaveLength(0);
  });

  it('emite os filtros restantes ao remover uma etiqueta', async () => {
    const filters: ActiveFilter[] = [
      { key: 'status', label: 'Situação', value: 'Em andamento' },
      { key: 'priority', label: 'Prioridade', value: 'Alta' },
    ];
    const element = await render({ data: buildPage(ROWS), activeFilters: filters });

    const captured: ActiveFilter[][] = [];
    fixture.componentInstance.filterChange.subscribe((value) => captured.push([...value]));

    element.querySelector<HTMLButtonElement>('mat-chip button[matChipRemove]')?.click();
    await fixture.whenStable();

    expect(captured[0]).toEqual([{ key: 'priority', label: 'Prioridade', value: 'Alta' }]);
  });

  it('limpa todos os filtros de uma vez', async () => {
    const element = await render({
      data: buildPage(ROWS),
      activeFilters: [{ key: 'status', label: 'Situação', value: 'Em andamento' }],
    });

    const captured: ActiveFilter[][] = [];
    fixture.componentInstance.filterChange.subscribe((value) => captured.push([...value]));

    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
    buttons.find((button) => button.textContent?.includes('Limpar filtros'))?.click();
    await fixture.whenStable();

    expect(captured[0]).toEqual([]);
  });
});
