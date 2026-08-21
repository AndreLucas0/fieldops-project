import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, colors, Feedback, spacing, Text } from '@/design-system';
import { uploadEvidence } from '@/features/evidence/evidence-upload';
import { captureLocation } from '@/features/inspections/location';
import { toApiError, type GeoLocation } from '@/models';

/**
 * FE-M13 — Prévia da evidência.
 *
 * Última conferência antes de gastar rede: a foto só sobe quando o técnico
 * confirma. "Refazer" volta à captura sem enviar nada.
 */
export default function EvidencePreviewScreen() {
  const router = useRouter();
  const { inspectionId, uri, description, origin, responseId, nonConformityId } =
    useLocalSearchParams<{
      inspectionId: string;
      uri: string;
      description?: string;
      origin?: string;
      inspectionItemId?: string;
      responseId?: string;
      nonConformityId?: string;
    }>();

  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function confirm(): Promise<void> {
    if (sending || !uri || !inspectionId) return;

    setSending(true);
    setFailure(null);

    try {
      // Localização é melhor esforço: a evidência vale mesmo sem coordenadas.
      const outcome = await captureLocation();
      const location: GeoLocation | null = outcome.status === 'captured' ? outcome.location : null;

      await uploadEvidence({
        inspectionId,
        fileUri: uri,
        description,
        responseId,
        nonConformityId,
        location,
      });

      // Volta à tela que pediu a evidência, descartando captura e prévia.
      if (origin === 'non-conformities') {
        router.dismissTo({
          pathname: '/inspections/[inspectionId]/non-conformities',
          params: { inspectionId },
        });
      } else {
        router.dismissTo({
          pathname: '/inspections/[inspectionId]/checklist',
          params: { inspectionId },
        });
      }
    } catch (thrown) {
      setFailure(toApiError(thrown).message);
    } finally {
      setSending(false);
    }
  }

  const linkLabel = nonConformityId
    ? 'Vinculada à não conformidade'
    : responseId
      ? 'Vinculada à resposta do item'
      : 'Vinculada à inspeção';

  return (
    <View style={styles.root}>
      {uri ? (
        <Image testID="previa-imagem" source={{ uri }} resizeMode="contain" style={styles.image} />
      ) : (
        <View style={styles.image}>
          <Text tone="muted" style={styles.centered}>
            Nenhuma imagem para exibir.
          </Text>
        </View>
      )}

      <View style={styles.panel}>
        <Text testID="previa-vinculo" variant="label">
          {linkLabel}
        </Text>

        {description ? (
          <Text testID="previa-descricao" variant="caption" tone="muted">
            {description}
          </Text>
        ) : (
          <Text variant="caption" tone="muted">
            Sem descrição.
          </Text>
        )}

        {failure ? <Feedback testID="previa-falha" tone="error" message={failure} /> : null}

        <View style={styles.actions}>
          <Button
            testID="previa-refazer"
            label="Refazer"
            variant="outline"
            disabled={sending}
            onPress={() => router.back()}
            style={styles.action}
          />
          <Button
            testID="previa-confirmar"
            label="Confirmar"
            loading={sending}
            disabled={!uri}
            onPress={confirm}
            style={styles.action}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  panel: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
});
