import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components';
import { Screen, spacing, Text } from '@/design-system';

/**
 * FE-M09 — Resumo e conclusão.
 *
 * Espaço reservado: a conferência final e o `POST /inspections/{id}/submit`
 * entram na próxima etapa.
 */
export default function SummaryScreen() {
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();

  return (
    <Screen testID="resumo-screen" insetTop={false} contentStyle={styles.content}>
      <EmptyState
        icon="checklist"
        title="Resumo da inspeção"
        message="Esta tela ainda será construída."
      />

      <Text testID="resumo-id" variant="caption" tone="muted" style={styles.centered}>
        Inspeção {inspectionId}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  centered: {
    textAlign: 'center',
  },
});
