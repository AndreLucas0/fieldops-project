import { fireEvent, render, screen } from '@testing-library/react-native';

import { Text } from '@/design-system';
import type { Evidence, Inspection, InspectionItemSnapshot, InspectionResponse } from '@/models';

import { ChecklistItemRenderer } from './ChecklistItemRenderer';
import { EvidenceThumbnailGrid } from './EvidenceThumbnailGrid';
import { InspectionCard, inspectionTitle } from './InspectionCard';
import { ProgressBar, progressState } from './ProgressBar';
import { SectionAccordion } from './SectionAccordion';
import { EmptyState, ErrorState, LoadingSpinner } from './StateViews';
import { StatusBadge } from './StatusBadge';
import { describeStatus } from './status-catalog';
import { formatScheduledFor } from './relative-date';

function buildInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
    templateVersionId: 'tv-1',
    clientId: 'c-1',
    siteId: 's-1',
    technicianId: 't-1',
    priority: 'HIGH',
    status: 'ASSIGNED',
    scheduledFor: '2026-08-14T13:45:00',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
    version: 1,
    ...overrides,
  };
}

function buildItem(overrides: Partial<InspectionItemSnapshot> = {}): InspectionItemSnapshot {
  return {
    id: 'item-1',
    inspectionId: 'insp-1',
    sectionTitle: 'Condições gerais',
    sectionOrder: 1,
    itemTitle: 'Área livre de obstruções?',
    responseType: 'CONFORMITY',
    required: true,
    itemOrder: 1,
    createdAt: '2026-08-14T10:00:00Z',
    ...overrides,
  };
}

function buildResponse(overrides: Partial<InspectionResponse> = {}): InspectionResponse {
  return {
    id: 'r1',
    inspectionItemId: 'item-1',
    answeredAtDevice: '2026-08-14T11:00:00Z',
    createdAt: '2026-08-14T11:00:00Z',
    updatedAt: '2026-08-14T11:00:00Z',
    version: 1,
    ...overrides,
  };
}

describe('StatusBadge', () => {
  it('exibe o rótulo em português do contexto', async () => {
    await render(<StatusBadge testID="badge" value="IN_PROGRESS" context="inspection" />);

    expect(screen.getByTestId('badge')).toHaveTextContent('Em andamento');
  });

  it('usa a mesma escala em prioridade e severidade', () => {
    expect(describeStatus('priority', 'CRITICAL')).toEqual(describeStatus('severity', 'CRITICAL'));
  });

  it('mostra valor desconhecido sem quebrar a lista', async () => {
    await render(<StatusBadge testID="badge" value="ESTADO_NOVO" context="inspection" />);

    expect(screen.getByTestId('badge')).toHaveTextContent('ESTADO_NOVO');
  });
});

describe('formatScheduledFor', () => {
  const now = new Date('2026-08-14T09:00:00');

  it('usa linguagem relativa na janela próxima', () => {
    expect(formatScheduledFor('2026-08-14T13:45:00', now)).toBe('Hoje, 13:45');
    expect(formatScheduledFor('2026-08-15T08:00:00', now)).toBe('Amanhã, 08:00');
    expect(formatScheduledFor('2026-08-13T17:30:00', now)).toBe('Ontem, 17:30');
  });

  it('volta à data completa fora da janela', () => {
    expect(formatScheduledFor('2026-08-20T08:00:00', now)).toBe('20/08/2026 08:00');
  });

  it('vira travessão quando a data não existe ou é inválida', () => {
    expect(formatScheduledFor(null, now)).toBe('—');
    expect(formatScheduledFor('não é data', now)).toBe('—');
  });
});

describe('InspectionCard', () => {
  it('usa o identificador curto quando não há título', () => {
    expect(inspectionTitle(buildInspection({ title: null }))).toBe('Inspeção #8a50e30d');
    expect(inspectionTitle(buildInspection({ title: '   ' }))).toBe('Inspeção #8a50e30d');
    expect(inspectionTitle(buildInspection({ title: 'Preventiva' }))).toBe('Preventiva');
  });

  it('exibe cliente e local quando a tela os informa', async () => {
    await render(
      <InspectionCard
        testID="card"
        inspection={buildInspection()}
        clientName="Metalúrgica Horizonte"
        siteName="Unidade Norte"
      />,
    );

    expect(screen.getByTestId('card')).toHaveTextContent(/Metalúrgica Horizonte • Unidade Norte/);
  });

  it('exibe estado e prioridade como etiquetas', async () => {
    await render(<InspectionCard testID="card" inspection={buildInspection()} />);

    const card = screen.getByTestId('card');
    expect(card).toHaveTextContent(/Atribuída/);
    expect(card).toHaveTextContent(/Alta/);
  });

  it('marca como atrasada só enquanto há trabalho pendente', async () => {
    const vencida = { scheduledFor: '2020-01-01T08:00:00' };

    await render(
      <>
        <InspectionCard
          testID="aberta"
          inspection={buildInspection({ ...vencida, status: 'ASSIGNED' })}
        />
        <InspectionCard
          testID="aprovada"
          inspection={buildInspection({ ...vencida, status: 'APPROVED' })}
        />
      </>,
    );

    expect(screen.getByTestId('aberta')).toHaveTextContent(/ATRASADA/);
    expect(screen.getByTestId('aprovada')).not.toHaveTextContent(/ATRASADA/);
  });

  it('entrega a inspeção ao toque', async () => {
    const onPress = jest.fn();
    const inspection = buildInspection();
    await render(<InspectionCard testID="card" inspection={inspection} onPress={onPress} />);

    await fireEvent.press(screen.getByTestId('card'));

    expect(onPress).toHaveBeenCalledWith(inspection);
  });
});

describe('ProgressBar', () => {
  it('escreve o progresso, sem depender de cor (§13.9)', async () => {
    await render(<ProgressBar testID="progress" answered={7} total={12} />);

    expect(screen.getByTestId('progress-label')).toHaveTextContent('7 de 12 respondidos');
  });

  it('muda de cor conforme o avanço', () => {
    expect(progressState(0, 10).ratio).toBe(0);
    expect(progressState(5, 10).ratio).toBe(0.5);
    expect(progressState(10, 10).ratio).toBe(1);

    const cores = [progressState(0, 10), progressState(5, 10), progressState(10, 10)].map(
      (state) => state.color,
    );
    expect(new Set(cores).size).toBe(3);
  });

  it('checklist sem itens não é tratado como concluído', () => {
    expect(progressState(0, 0)).toEqual(progressState(0, 10));
  });

  it('não passa de 100% se vierem mais respostas que itens', () => {
    expect(progressState(15, 10).ratio).toBe(1);
  });
});

describe('ChecklistItemRenderer', () => {
  it('marca item obrigatório e alterna pendente/respondido', async () => {
    const { rerender } = await render(
      <ChecklistItemRenderer testID="item" item={buildItem()} onChange={jest.fn()} />,
    );

    expect(screen.getByTestId('item-indicator')).toHaveTextContent('○');
    expect(screen.getByTestId('item')).toHaveTextContent(/\*/);

    await rerender(
      <ChecklistItemRenderer
        testID="item"
        item={buildItem()}
        response={buildResponse({ conformity: 'CONFORMING' })}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('item-indicator')).toHaveTextContent('✓');
  });

  it('emite a conformidade escolhida', async () => {
    const onChange = jest.fn();
    await render(<ChecklistItemRenderer testID="item" item={buildItem()} onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('item-control-CONFORMING'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ conformity: 'CONFORMING' }));
  });

  it('pede observação e evidência ao marcar não conforme', async () => {
    const item = buildItem({
      rulesJson: { observationRequiredOnFailure: true, evidenceRequiredOnFailure: true },
    });
    await render(<ChecklistItemRenderer testID="item" item={item} onChange={jest.fn()} />);

    expect(screen.queryByTestId('item-observation')).toBeNull();
    expect(screen.queryByTestId('item-evidence-required')).toBeNull();

    await fireEvent.press(screen.getByTestId('item-control-NON_CONFORMING'));

    expect(screen.getByTestId('item-observation')).toBeTruthy();
    expect(screen.getByTestId('item-evidence-required')).toBeTruthy();
    expect(screen.getByTestId('item')).toHaveTextContent(/exige observação/);
  });

  it('a mensagem de observação some quando o campo é preenchido', async () => {
    const item = buildItem({ rulesJson: { observationRequiredOnFailure: true } });
    await render(<ChecklistItemRenderer testID="item" item={item} onChange={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('item-control-NON_CONFORMING'));
    await fireEvent.changeText(screen.getByTestId('item-observation'), 'Paletes na frente.');

    expect(screen.getByTestId('item')).not.toHaveTextContent(/exige observação/);
  });

  it('não exige observação quando a regra não pede', async () => {
    await render(
      <ChecklistItemRenderer
        testID="item"
        item={buildItem({ rulesJson: null })}
        onChange={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('item-control-NON_CONFORMING'));

    expect(screen.queryByTestId('item-evidence-required')).toBeNull();
    expect(screen.getByTestId('item')).not.toHaveTextContent(/exige observação/);
  });

  it('converte número com vírgula e descarta texto inválido', async () => {
    const onChange = jest.fn();
    await render(
      <ChecklistItemRenderer
        testID="item"
        item={buildItem({ responseType: 'NUMBER' })}
        onChange={onChange}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('item-control'), '82,4');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ valueNumber: 82.4 }));

    await fireEvent.changeText(screen.getByTestId('item-control'), 'abc');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ valueNumber: null }));
  });

  it('renderiza as alternativas de escolha única', async () => {
    const onChange = jest.fn();
    const item = buildItem({
      responseType: 'SINGLE_CHOICE',
      optionsJson: {
        options: [
          { value: 'BOM', label: 'Bom' },
          { value: 'RUIM', label: 'Ruim' },
        ],
      },
    });
    await render(<ChecklistItemRenderer testID="item" item={item} onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('item-control-RUIM'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ valueText: 'RUIM' }));
  });

  it('avisa quando a escolha única não tem alternativas configuradas', async () => {
    const item = buildItem({ responseType: 'SINGLE_CHOICE', optionsJson: null });
    await render(<ChecklistItemRenderer testID="item" item={item} onChange={jest.fn()} />);

    expect(screen.getByTestId('item')).toHaveTextContent(/não tem alternativas/);
  });

  it('em modo leitura não aceita alteração', async () => {
    const onChange = jest.fn();
    await render(
      <ChecklistItemRenderer testID="item" item={buildItem()} onChange={onChange} disabled />,
    );

    await fireEvent.press(screen.getByTestId('item-control-CONFORMING'));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('SectionAccordion', () => {
  it('mostra o progresso da seção e alterna o conteúdo', async () => {
    await render(
      <SectionAccordion testID="secao" title="Condições gerais" itemCount={4} answeredCount={2}>
        <Text testID="filho">conteúdo</Text>
      </SectionAccordion>,
    );

    expect(screen.getByTestId('secao-count')).toHaveTextContent('2/4');
    expect(screen.getByTestId('filho')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('secao-toggle'));
    expect(screen.queryByTestId('filho')).toBeNull();

    await fireEvent.press(screen.getByTestId('secao-toggle'));
    expect(screen.getByTestId('filho')).toBeTruthy();
  });

  it('pode começar recolhida', async () => {
    await render(
      <SectionAccordion
        testID="secao"
        title="Operação"
        itemCount={3}
        answeredCount={0}
        defaultExpanded={false}>
        <Text testID="filho">conteúdo</Text>
      </SectionAccordion>,
    );

    expect(screen.queryByTestId('filho')).toBeNull();
  });
});

describe('EvidenceThumbnailGrid', () => {
  const evidence: Evidence = {
    id: 'e-1',
    inspectionId: 'insp-1',
    type: 'PHOTO',
    accessUrl: 'https://example.test/foto.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    capturedAtDevice: '2026-08-14T11:00:00',
    createdAt: '2026-08-14T11:00:00Z',
  };

  it('informa a ausência de fotos', async () => {
    await render(<EvidenceThumbnailGrid testID="grid" evidences={[]} />);

    expect(screen.getByTestId('grid-empty')).toHaveTextContent(/Nenhuma evidência/);
  });

  it('abre a foto em tela cheia ao tocar na miniatura', async () => {
    await render(<EvidenceThumbnailGrid testID="grid" evidences={[evidence]} />);

    expect(screen.queryByTestId('grid-full')).toBeNull();

    await fireEvent.press(screen.getByTestId('grid-item-0'));

    expect(screen.getByTestId('grid-full')).toBeTruthy();
    expect(screen.getByTestId('grid-close')).toBeTruthy();
  });

  it('fecha a visualização', async () => {
    await render(<EvidenceThumbnailGrid testID="grid" evidences={[evidence]} />);

    await fireEvent.press(screen.getByTestId('grid-item-0'));
    await fireEvent.press(screen.getByTestId('grid-close'));

    expect(screen.queryByTestId('grid-full')).toBeNull();
  });
});

describe('estados padrão', () => {
  it('LoadingSpinner anuncia o carregamento', async () => {
    await render(<LoadingSpinner testID="loading" message="Buscando inspeções…" />);

    expect(screen.getByTestId('loading')).toHaveTextContent('Buscando inspeções…');
  });

  it('EmptyState oferece a ação quando existe', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        testID="vazio"
        title="Nenhuma inspeção"
        message="Nada atribuído a você."
        actionLabel="Atualizar"
        onAction={onAction}
      />,
    );

    await fireEvent.press(screen.getByTestId('vazio-action'));

    expect(screen.getByTestId('vazio')).toHaveTextContent(/Nenhuma inspeção/);
    expect(onAction).toHaveBeenCalled();
  });

  it('ErrorState mostra o código da ocorrência e tenta de novo', async () => {
    const onRetry = jest.fn();
    await render(
      <ErrorState testID="erro" message="Sem conexão." requestId="req-9" onRetry={onRetry} />,
    );

    await fireEvent.press(screen.getByTestId('erro-retry'));

    expect(screen.getByTestId('erro')).toHaveTextContent(/req-9/);
    expect(onRetry).toHaveBeenCalled();
  });
});
