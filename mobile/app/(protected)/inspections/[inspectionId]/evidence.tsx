import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components';
import { Screen, spacing, Text } from '@/design-system';

/**
 * FE-M12 — Captura de evidência.
 *
 * Espaço reservado: a câmera e o `POST /inspections/{id}/evidence` entram na
 * próxima etapa. Já recebe o vínculo com o item e, quando existe, com a
 * resposta gravada.
 */
export default function EvidenceScreen() {
  const { inspectionItemId, responseId } = useLocalSearchParams<{
    inspectionItemId?: string;
    responseId?: string;
  }>();

  return (
    <Screen testID="evidencia-screen" insetTop={false} contentStyle={styles.content}>
      <EmptyState
        icon="camera"
        title="Captura de evidência"
        message="Esta tela ainda será construída."
      />

      <Text testID="evidencia-vinculo" variant="caption" tone="muted" style={styles.centered}>
        Item {inspectionItemId ?? '—'}
        {responseId ? ` · resposta ${responseId}` : ' · resposta ainda não gravada'}
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
