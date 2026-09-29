import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { apiClient } from '@/services/api-client';
import { syncPendingIfOnline } from '@/services/sync-service';

export function useSyncOnForeground(): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    void syncPendingIfOnline(apiClient);

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current !== 'active' && nextState === 'active') {
        void syncPendingIfOnline(apiClient);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);
}
