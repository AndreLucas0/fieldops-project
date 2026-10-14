import { act, renderHook } from '@testing-library/react-native';

jest.mock('@/services/sync-service', () => ({
  syncPendingIfOnline: jest.fn().mockResolvedValue({ synced: 0, failed: 0 }),
  isOnline: jest.fn().mockResolvedValue(true),
  getOrCreateDeviceId: jest.fn().mockResolvedValue('device-test-001'),
}));

jest.mock('@/services/api-client', () => ({
  apiClient: {},
}));

import { useSyncOnForeground } from '@/features/sync/use-sync';
import { syncPendingIfOnline } from '@/services/sync-service';

const mockSync = syncPendingIfOnline as jest.Mock;

type NetworkState = { isInternetReachable: boolean | null };
type NetworkListener = (state: NetworkState) => void;

let capturedListener: NetworkListener | null = null;
let removeNetworkSub: jest.Mock;
let mockAddNetworkListener: jest.Mock;

beforeEach(() => {
  mockSync.mockReset().mockResolvedValue({ synced: 0, failed: 0 });
  capturedListener = null;
  removeNetworkSub = jest.fn();
  mockAddNetworkListener = jest.fn().mockImplementation((fn: NetworkListener) => {
    capturedListener = fn;
    return { remove: removeNetworkSub };
  });
});

describe('useSyncOnForeground', () => {
  it('dispara syncPendingIfOnline ao montar', async () => {
    await renderHook(() => useSyncOnForeground(mockAddNetworkListener));
    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('registra listener de rede ao montar', async () => {
    await renderHook(() => useSyncOnForeground(mockAddNetworkListener));
    expect(mockAddNetworkListener).toHaveBeenCalledTimes(1);
    expect(capturedListener).not.toBeNull();
  });

  it('dispara sync quando rede reconecta (offline → online)', async () => {
    await renderHook(() => useSyncOnForeground(mockAddNetworkListener));
    mockSync.mockClear();

    await act(async () => {
      capturedListener?.({ isInternetReachable: false });
    });
    await act(async () => {
      capturedListener?.({ isInternetReachable: true });
    });

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('não dispara sync quando já estava online (null → true na primeira leitura)', async () => {
    await renderHook(() => useSyncOnForeground(mockAddNetworkListener));
    mockSync.mockClear();

    await act(async () => {
      capturedListener?.({ isInternetReachable: true });
    });

    expect(mockSync).not.toHaveBeenCalled();
  });

  it('não dispara sync quando rede fica offline', async () => {
    await renderHook(() => useSyncOnForeground(mockAddNetworkListener));
    mockSync.mockClear();

    await act(async () => {
      capturedListener?.({ isInternetReachable: false });
    });

    expect(mockSync).not.toHaveBeenCalled();
  });

  it('não dispara sync repetido quando já estava online (true → true)', async () => {
    await renderHook(() => useSyncOnForeground(mockAddNetworkListener));
    mockSync.mockClear();

    await act(async () => {
      capturedListener?.({ isInternetReachable: true });
    });
    await act(async () => {
      capturedListener?.({ isInternetReachable: true });
    });

    expect(mockSync).not.toHaveBeenCalled();
  });

  it('remove o listener de rede ao desmontar', async () => {
    const { unmount } = await renderHook(() => useSyncOnForeground(mockAddNetworkListener));
    await act(async () => { unmount(); });
    expect(removeNetworkSub).toHaveBeenCalledTimes(1);
  });
});
