import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { addNetworkStateListener } from 'expo-network';

import { apiClient } from '@/services/api-client';
import { syncPendingIfOnline } from '@/services/sync-service';

type NetworkListener = (state: { isInternetReachable: boolean | null }) => void;
type AddNetworkListener = (fn: NetworkListener) => { remove: () => void };

export function useSyncOnForeground(
  _addNetworkListener: AddNetworkListener = addNetworkStateListener,
): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const prevReachable = useRef<boolean | null>(null);
  const addListenerRef = useRef(_addNetworkListener);

  useEffect(() => {
    void syncPendingIfOnline(apiClient);
    const networkSub = addListenerRef.current(({ isInternetReachable }) => {
      if (prevReachable.current === false && isInternetReachable === true) {
        void syncPendingIfOnline(apiClient);
      }
      prevReachable.current = isInternetReachable ?? null;
    });

    const appSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current !== 'active' && nextState === 'active') {
        void syncPendingIfOnline(apiClient);
      }
      appState.current = nextState;
    });

    return () => {
      networkSub.remove();
      appSub.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
