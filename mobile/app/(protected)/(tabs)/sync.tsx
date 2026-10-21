import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { LoadingSpinner } from '@/components';
import { Button, Panel, Screen, spacing, Text } from '@/design-system';
import { apiClient } from '@/services';
import { countPendingEntries, getFailedEntries, getSyncMetadata, type OutboxRow } from '@/services/local-db';
import {
  discardOutboxEntry,
  isOnline,
  syncPendingIfOnline,
  type SyncResult,
} from '@/services/sync-service';

const ENTITY_LABELS: Record<string, string> = {
  INSPECTION: 'Inspeção',
  INSPECTION_RESPONSE: 'Resposta',
  NON_CONFORMITY: 'Não conformidade',
  EVIDENCE: 'Evidência',
};

/**
 * FE-M04 — Sincronização.
 *
 * Exibe a fila pendente do outbox e permite acionar sync manual.
 * A sync automática (useSyncOnForeground) continua acontecendo em segundo
 * plano; esta tela torna o estado visível e dá controle ao técnico.
 */
export default function SyncScreen() {
  const [pending, setPending] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [failedEntries, setFailedEntries] = useState<OutboxRow[]>([]);

  const loadPending = useCallback(async () => {
    const [count, syncTime, failed, connectivity] = await Promise.all([
      countPendingEntries(),
      getSyncMetadata('last_successful_sync'),
      getFailedEntries(),
      isOnline(),
    ]);
    setPending(count);
    setLastSyncTime(syncTime);
    setFailedEntries(failed);
    setOnline(connectivity);
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  useFocusEffect(
    useCallback(() => {
      void loadPending();
    }, [loadPending]),
  );

  async function handleSync(): Promise<void> {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncPendingIfOnline(apiClient);
      setLastResult(result);
      await loadPending();
    } finally {
      setSyncing(false);
    }
  }

  // Recusa definitiva não volta a ser enviada (REJECTED): o técnico decide
  // quando tirá-la do aparelho — e, se for foto, apagar o arquivo.
  async function handleDiscard(entry: OutboxRow): Promise<void> {
    await discardOutboxEntry(entry);
    await loadPending();
  }

  return (
    <Screen testID="sync-screen" contentStyle={styles.content}>
      <Text variant="title">Sincronização</Text>

      {pending === null ? (
        <LoadingSpinner testID="sync-loading" message="Verificando fila…" />
      ) : (
        <>
          <Panel testID="sync-status" style={styles.panel}>
            <Text testID="sync-pending-count">
              {pending === 0
                ? 'Tudo sincronizado'
                : `${pending} ${pending === 1 ? 'item' : 'itens'} na fila`}
            </Text>
            {online !== null && (
              <Text testID="sync-connectivity">{online ? 'Online' : 'Offline'}</Text>
            )}
          </Panel>

          {failedEntries.length > 0 && (
            <Panel testID="sync-errors" style={styles.panel}>
              <Text testID="sync-failed-count">
                {failedEntries.length}{' '}
                {failedEntries.length === 1 ? 'operação com erro' : 'operações com erro'}
              </Text>
              {failedEntries
                .filter((entry) => entry.status === 'REJECTED')
                .map((entry) => (
                  <Panel key={entry.id} testID={`sync-rejected-${entry.id}`} style={styles.panel}>
                    <Text variant="label">
                      {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type} recusada pelo servidor
                    </Text>
                    {entry.last_error !== null && (
                      <Text variant="caption" tone="muted">
                        {entry.last_error}
                      </Text>
                    )}
                    <Button
                      testID={`sync-rejected-${entry.id}-discard`}
                      label="Descartar"
                      variant="outline"
                      onPress={() => void handleDiscard(entry)}
                    />
                  </Panel>
                ))}
            </Panel>
          )}

          {lastSyncTime !== null && (
            <Panel testID="sync-last-time" style={styles.panel}>
              <Text>Última sincronização: {new Date(lastSyncTime).toLocaleString()}</Text>
            </Panel>
          )}

          {lastResult !== null && (
            <Panel testID="sync-result" style={styles.panel}>
              <Text testID="sync-result-synced">
                {lastResult.synced} {lastResult.synced === 1 ? 'item' : 'itens'} sincronizados
              </Text>
              {lastResult.failed > 0 && (
                <Text testID="sync-result-failed">{lastResult.failed} com erro</Text>
              )}
            </Panel>
          )}

          <Button
            testID="sync-button"
            label="Sincronizar agora"
            loading={syncing}
            onPress={() => void handleSync()}
            style={styles.button}
          />
          <Button
            testID="sync-details"
            label="Ver detalhes"
            variant="secondary"
            onPress={() => router.push('/sync/details')}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing['2xl'],
  },
  panel: {
    gap: spacing.xs,
  },
  button: {
    marginTop: 'auto',
  },
});
