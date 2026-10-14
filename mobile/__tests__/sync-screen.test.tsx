import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));
jest.mock('@/services/sync-service', () => ({
  syncPendingIfOnline: jest.fn().mockResolvedValue({ synced: 0, failed: 0 }),
  isOnline: jest.fn().mockResolvedValue(true),
  getOrCreateDeviceId: jest.fn().mockResolvedValue('device-test-001'),
}));

import SyncScreen from '../app/(protected)/(tabs)/sync';
import { resetRouterMock, routerMock } from '@/test-utils/expo-router-mock';
import { renderWithSession } from '@/test-utils/render';
import { isOnline, syncPendingIfOnline } from '@/services/sync-service';
import { markEntryFailed, saveSyncMetadata, upsertOutboxEntry } from '@/services/local-db';

const mockSync = syncPendingIfOnline as jest.Mock;
const mockIsOnline = isOnline as jest.Mock;

beforeEach(() => {
  resetRouterMock();
  mockSync.mockReset().mockResolvedValue({ synced: 0, failed: 0 });
  mockIsOnline.mockReset().mockResolvedValue(true);
});

async function renderSync() {
  await renderWithSession(<SyncScreen />);
  await waitFor(() => expect(screen.queryByTestId('sync-loading')).toBeNull());
}

describe('FE-M04 — Sincronização', () => {
  it('exibe "Tudo sincronizado" quando a fila está vazia', async () => {
    await renderSync();

    expect(screen.getByTestId('sync-pending-count')).toHaveTextContent('Tudo sincronizado');
  });

  it('exibe a contagem quando há itens pendentes na fila', async () => {
    await upsertOutboxEntry({
      id: 'e1',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-1',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });
    await upsertOutboxEntry({
      id: 'e2',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-2',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });

    await renderSync();

    expect(screen.getByTestId('sync-pending-count')).toHaveTextContent('2 itens na fila');
  });

  it('botão aciona a sincronização', async () => {
    await renderSync();

    await fireEvent.press(screen.getByTestId('sync-button'));

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1));
  });

  it('exibe resultado após sincronização', async () => {
    mockSync.mockResolvedValueOnce({ synced: 3, failed: 1 });

    await renderSync();
    await fireEvent.press(screen.getByTestId('sync-button'));

    await waitFor(() =>
      expect(screen.getByTestId('sync-result-synced')).toHaveTextContent('3 itens sincronizados'),
    );
    expect(screen.getByTestId('sync-result-failed')).toHaveTextContent('1 com erro');
  });

  it('exibe a data da última sincronização bem-sucedida', async () => {
    await saveSyncMetadata('last_successful_sync', '2026-10-14T10:00:00.000Z');

    await renderSync();

    await waitFor(() =>
      expect(screen.getByTestId('sync-last-time')).toBeTruthy(),
    );
  });

  it('não exibe seção de última sincronização quando nunca sincronizou', async () => {
    await renderSync();

    expect(screen.queryByTestId('sync-last-time')).toBeNull();
  });

  it('exibe indicador "Online" quando conectado', async () => {
    mockIsOnline.mockResolvedValue(true);

    await renderSync();

    expect(screen.getByTestId('sync-connectivity')).toHaveTextContent('Online');
  });

  it('exibe indicador "Offline" quando sem conexão', async () => {
    mockIsOnline.mockResolvedValue(false);

    await renderSync();

    expect(screen.getByTestId('sync-connectivity')).toHaveTextContent('Offline');
  });

  it('exibe contagem de erros quando há entradas FAILED no outbox', async () => {
    await upsertOutboxEntry({
      id: 'fail-1',
      inspectionId: 'insp-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-1',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: '{}',
    });
    await markEntryFailed('fail-1', 'FAILED');

    await renderSync();

    expect(screen.getByTestId('sync-failed-count')).toHaveTextContent('1 operação com erro');
  });

  it('não exibe seção de erros quando não há entradas com falha', async () => {
    await renderSync();

    expect(screen.queryByTestId('sync-failed-count')).toBeNull();
  });

  it('abre detalhes de sincronização ao pressionar o link de diagnóstico', async () => {
    await renderSync();

    await fireEvent.press(screen.getByTestId('sync-details'));

    expect(routerMock.push).toHaveBeenCalledWith('/sync/details');
  });
});
