import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components';
import { Screen, spacing, Text } from '@/design-system';

/**
 * FE-M10 — Não conformidades da inspeção.
 *
 * Espaço reservado: o registro (`POST /inspections/{id}/non-conformities`)
 * entra na próxima etapa. Já recebe o item que originou o apontamento.
 */
export default function NonConformitiesScreen() {
  const { inspectionItemId } = useLocalSearchParams<{ inspectionItemId?: string }>();

  return (
    <Screen testID="nc-screen" insetTop={false} contentStyle={styles.content}>
      <EmptyState
        icon="clipboard"
        title="Não conformidades"
        message="Esta tela ainda será construída."
      />

      <Text testID="nc-vinculo" variant="caption" tone="muted" style={styles.centered}>
        Item {inspectionItemId ?? '—'}
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
