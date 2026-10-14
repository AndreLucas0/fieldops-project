import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { LoadingSpinner } from '@/components';
import { Panel, Screen, spacing, Text } from '@/design-system';
import { getPendingEntries, type OutboxRow } from '@/services/local-db';

/**
 * FE-M14 — Detalhes de sincronização.
 *
 * Diagnóstico técnico da fila local (aplicativo-mobile.md §13.4).
 * Tela somente leitura — exibe entradas não concluídas do outbox.
 */
export default function SyncDetailsScreen() {
  const [entries, setEntries] = useState<OutboxRow[] | null>(null);

  const loadEntries = useCallback(async () => {
    const rows = await getPendingEntries();
    setEntries(rows);
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries]),
  );

  return (
    <Screen testID="details-screen" contentStyle={styles.content}>
      <Text variant="title">Detalhes de sincronização</Text>

      {entries === null ? (
        <LoadingSpinner testID="details-loading" message="Carregando operações…" />
      ) : entries.length === 0 ? (
        <Panel testID="details-empty" style={styles.panel}>
          <Text>Nenhuma operação pendente</Text>
        </Panel>
      ) : (
        entries.map((entry) => (
          <Panel key={entry.id} testID={`details-item-${entry.id}`} style={styles.panel}>
            <Text testID={`details-item-${entry.id}-type`}>{entry.entity_type}</Text>
            <Text testID={`details-item-${entry.id}-status`}>{entry.status}</Text>
            {entry.error_count > 0 && (
              <Text testID={`details-item-${entry.id}-attempts`}>
                {entry.error_count} {entry.error_count === 1 ? 'tentativa' : 'tentativas'}
              </Text>
            )}
            {entry.last_error !== null && (
              <Text testID={`details-item-${entry.id}-error`}>{entry.last_error}</Text>
            )}
          </Panel>
        ))
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
});
