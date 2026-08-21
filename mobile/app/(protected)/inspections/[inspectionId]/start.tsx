import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  ErrorState,
  LoadingSpinner,
  StatusBadge,
  formatDateTime,
  parseIsoDate,
} from '@/components';
import { Button, Feedback, Panel, Screen, spacing, Text } from '@/design-system';
import { captureLocation, describeAccuracy } from '@/features/inspections/location';
import { useInspectionDetail } from '@/features/inspections/use-inspection-detail';
import { apiClient } from '@/services';
import { toApiError, type GeoLocation, type Inspection, type StartInspectionRequest } from '@/models';

/**
 * FE-M07 — Iniciar inspeção.
 *
 * Confirma o início e registra onde o técnico estava (RN-061, RN-062).
 *
 * TODO: PEND-F03 — a obrigatoriedade de GPS por inspeção não está parametrizada
 * em nenhum DTO do contrato. Enquanto não estiver, o início é permitido sem
 * localização, com aviso explícito na tela e no que é enviado à API.
 */
export default function StartInspectionScreen() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const { inspection, places, loading, error, reload } = useInspectionDetail(inspectionId);

  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (loading) {
    return <LoadingSpinner testID="iniciar-loading" message="Carregando a inspeção…" />;
  }

  if (error || !inspection) {
    return (
      <ErrorState
        testID="iniciar-error"
        message={error?.message ?? 'Inspeção não encontrada.'}
        requestId={error?.requestId ?? null}
        onRetry={reload}
      />
    );
  }

  // Referência estável para `start`: o estreitamento não atravessa a closure.
  const detail = inspection;

  // Pré-condição da tela: só faz sentido iniciar o que está atribuído.
  if (detail.status !== 'ASSIGNED') {
    return (
      <Screen testID="iniciar-estado-invalido" insetTop={false} contentStyle={styles.content}>
        <Feedback
          tone="warning"
          message="Esta inspeção não está mais aguardando início. Volte ao detalhe para ver a situação atual."
        />
        <Button label="Voltar" variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function start(withLocation: boolean): Promise<void> {
    if (submitting) return;

    setSubmitting(true);
    setFailure(null);

    try {
      let captured: GeoLocation | null = null;

      if (withLocation) {
        const outcome = await captureLocation();

        if (outcome.status === 'captured') {
          captured = outcome.location;
          setLocation(outcome.location);
          setLocationNotice(null);
        } else {
          // Sem posição, o início segue sem `location` — PEND-F03 acima.
          setLocationNotice(
            outcome.status === 'denied'
              ? 'Permissão de localização negada. A inspeção será iniciada sem coordenadas.'
              : `${outcome.reason} A inspeção será iniciada sem coordenadas.`,
          );
        }
      }

      const body: StartInspectionRequest = {
        startedAtDevice: new Date().toISOString(),
        ...(captured ? { location: captured } : {}),
      };

      await apiClient.post<Inspection>(`/inspections/${detail.id}/start`, body);

      router.replace({
        pathname: '/inspections/[inspectionId]/checklist',
        params: { inspectionId: detail.id },
      });
    } catch (thrown) {
      setFailure(toApiError(thrown).message);
    } finally {
      setSubmitting(false);
    }
  }

  const scheduled = parseIsoDate(detail.scheduledFor);

  return (
    <Screen testID="iniciar-screen" insetTop={false} contentStyle={styles.content}>
      <Text variant="title">Iniciar inspeção</Text>

      <Panel testID="iniciar-resumo" style={styles.panel}>
        <Text variant="subtitle">
          {detail.title?.trim() || `Inspeção #${detail.id.slice(0, 8)}`}
        </Text>

        <View style={styles.badges}>
          <StatusBadge value={detail.status} context="inspection" size="sm" />
          <StatusBadge value={detail.priority} context="priority" size="sm" />
        </View>

        <Text variant="caption" tone="muted">
          {[places.clientName, places.siteName].filter(Boolean).join(' • ') || '—'}
        </Text>

        {places.equipmentName ? (
          <Text variant="caption" tone="muted">
            {places.equipmentName}
          </Text>
        ) : null}

        {scheduled ? (
          <Text variant="caption" tone="muted">
            Agendada para {formatDateTime(scheduled)}
          </Text>
        ) : null}
      </Panel>

      <Panel testID="iniciar-localizacao" style={styles.panel}>
        <Text variant="label">Localização</Text>
        <Text variant="caption" tone="muted">
          O aplicativo registra onde a inspeção começou. A permissão é pedida na confirmação.
        </Text>

        {location ? (
          <Text testID="iniciar-coordenadas" variant="caption" tone="success">
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} —{' '}
            {describeAccuracy(location)}
          </Text>
        ) : null}
      </Panel>

      {locationNotice ? (
        <Feedback testID="iniciar-aviso-localizacao" tone="warning" message={locationNotice} />
      ) : null}

      {failure ? <Feedback testID="iniciar-falha" tone="error" message={failure} /> : null}

      <View style={styles.actions}>
        <Button
          testID="iniciar-confirmar"
          label="Confirmar início"
          loading={submitting}
          onPress={() => start(true)}
        />

        <Button
          testID="iniciar-sem-localizacao"
          label="Continuar sem localização"
          variant="outline"
          disabled={submitting}
          onPress={() => start(false)}
          accessibilityHint="Inicia a inspeção sem registrar coordenadas"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  panel: {
    gap: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    marginTop: 'auto',
  },
});
