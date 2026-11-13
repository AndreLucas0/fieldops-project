import { screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import SyncDetailsScreen from '../app/(protected)/sync/details';
import { resetRouterMock } from '@/test-utils/expo-router-mock';
import { renderWithSession } from '@/test-utils/render';
import { markEntryFailed, markEntriesSynced, upsertOutboxEntry } from '@/services/local-db';

beforeEach(() => {
  resetRouterMock();
});

async function renderDetails() {
  await renderWithSession(<SyncDetailsScreen />);
  await waitFor(() => expect(screen.queryByTestId('details-loading')).toBeNull());
}

describe('FE-M14 — Detalhes de sincronização', () => {
  it('exibe mensagem quando a fila está vazia', async () => {
    await renderDetails();

    expect(screen.getByTestId('details-empty')).toBeTruthy();
  });

  it('não exibe mensagem de vazio quando há entradas', async () => {
    await upsertOutboxEntry({
      id: 'op-1',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-1',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });

    await renderDetails();

    expect(screen.queryByTestId('details-empty')).toBeNull();
  });

  it('exibe entityType e status de uma entrada pendente', async () => {
    await upsertOutboxEntry({
      id: 'op-1',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-1',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });

    await renderDetails();

    expect(screen.getByTestId('details-item-op-1-type')).toHaveTextContent('INSPECTION_RESPONSE');
    expect(screen.getByTestId('details-item-op-1-status')).toHaveTextContent('PENDING');
  });

  it('exibe o contador de tentativas para entradas com erro', async () => {
    await upsertOutboxEntry({
      id: 'op-2',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-2',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });
    await markEntryFailed('op-2', 'FAILED');
    await markEntryFailed('op-2', 'FAILED');

    await renderDetails();

    expect(screen.getByTestId('details-item-op-2-attempts')).toHaveTextContent('2 tentativas');
  });

  it('exibe lastError para entradas FAILED', async () => {
    await upsertOutboxEntry({
      id: 'op-3',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-3',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });
    await markEntryFailed('op-3', 'FAILED', 'Servidor indisponível');

    await renderDetails();

    expect(screen.getByTestId('details-item-op-3-error')).toHaveTextContent(
      'Servidor indisponível',
    );
  });

  it('exibe entradas com status CONFLICT', async () => {
    await upsertOutboxEntry({
      id: 'op-4',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-4',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });
    await markEntryFailed('op-4', 'CONFLICT');

    await renderDetails();

    expect(screen.getByTestId('details-item-op-4-status')).toHaveTextContent('CONFLICT');
  });

  it('não exibe entradas COMPLETED', async () => {
    await upsertOutboxEntry({
      id: 'op-5',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-5',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });
    await markEntriesSynced(['op-5']);

    await renderDetails();

    expect(screen.queryByTestId('details-item-op-5-type')).toBeNull();
    expect(screen.getByTestId('details-empty')).toBeTruthy();
  });
});
