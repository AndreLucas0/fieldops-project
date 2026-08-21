import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorState, LoadingSpinner, ProgressBar } from '@/components';
import { Button, colors, Feedback, Panel, Screen, spacing, Text } from '@/design-system';
import { BLOCKER_LABELS, evaluateCompletion } from '@/features/checklist/completion';
import { captureLocation, describeAccuracy } from '@/features/inspections/location';
import { useEvidences } from '@/features/inspections/use-evidences';
import { useInspectionDetail } from '@/features/inspections/use-inspection-detail';
import { toApiError, type GeoLocation, type Inspection, type SubmitInspectionRequest } from '@/models';
import { apiClient } from '@/services';

/**
 * FE-M09 — Resumo e conclusão.
 *
 * Última parada antes do envio: mostra o que foi feito, o que falta e por quê,
 * e só libera "Concluir" quando nada mais trava.
 */
export default function SummaryScreen() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();

  const { inspection, loading, error, reload } = useInspectionDetail(inspectionId);
  const { evidences, loading: loadingEvidences } = useEvidences(inspectionId);

  const [submitting, setSubmitting] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (loading || loadingEvidences) {
    return <LoadingSpinner testID="resumo-loading" message="Reunindo o resumo…" />;
  }

  if (error || !inspection) {
    return (
      <ErrorState
        testID="resumo-error"
        message={error?.message ?? 'Inspeção não encontrada.'}
        requestId={error?.requestId ?? null}
        onRetry={reload}
      />
    );
  }

  const detail = inspection;

  if (detail.status !== 'IN_PROGRESS') {
    return (
      <Screen testID="resumo-estado-invalido" insetTop={false} contentStyle={styles.content}>
        <Feedback
          tone="info"
          message="Esta inspeção não está em execução. Não há o que concluir aqui."
        />
        <Button label="Ver detalhes" variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  const summary = evaluateCompletion(
    detail.items ?? [],
    detail.responses ?? [],
    evidences,
    detail.nonConformities ?? [],
  );

  function openItem(itemId: string): void {
    router.push({
      pathname: '/inspections/[inspectionId]/checklist',
      params: { inspectionId: detail.id, focus: itemId },
    });
  }

  async function submit(): Promise<void> {
    if (submitting || !summary.canSubmit) return;

    setSubmitting(true);
    setFailure(null);

    try {
      const outcome = await captureLocation();
      let location: GeoLocation | null = null;

      if (outcome.status === 'captured') {
        location = outcome.location;
        setLocationNotice(`Localização registrada. ${describeAccuracy(outcome.location)}.`);
      } else {
        // Mesma política do início (PEND-F03): a falta de GPS não bloqueia.
        setLocationNotice(
          outcome.status === 'denied'
            ? 'Permissão de localização negada. A conclusão será enviada sem coordenadas.'
            : `${outcome.reason} A conclusão será enviada sem coordenadas.`,
        );
      }

      const body: SubmitInspectionRequest = {
        completedAtDevice: new Date().toISOString(),
        ...(location ? { location } : {}),
      };

      await apiClient.post<Inspection>(`/inspections/${detail.id}/submit`, body);

      router.replace({
        pathname: '/inspections/[inspectionId]',
        params: { inspectionId: detail.id },
      });
    } catch (thrown) {
      setFailure(toApiError(thrown).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen testID="resumo-screen" insetTop={false} contentStyle={styles.content}>
      <Panel testID="resumo-numeros" style={styles.panel}>
        <Text variant="label" tone="muted">
          Progresso
        </Text>
        <ProgressBar
          testID="resumo-progress"
          answered={summary.answeredItems}
          total={summary.totalItems}
        />

        <View style={styles.counters}>
          <Counter testID="resumo-obrigatorios" label="Obrigatórios" value={summary.requiredItems} />
          <Counter testID="resumo-ncs" label="Não conformidades" value={summary.nonConformities} />
          <Counter testID="resumo-evidencias" label="Evidências" value={summary.evidences} />
        </View>
      </Panel>

      {summary.blockers.length > 0 ? (
        <Panel testID="resumo-pendencias" style={[styles.panel, styles.blocked]}>
          <Text variant="label" tone="danger">
            {summary.blockers.length} pendência(s) impedem a conclusão
          </Text>

          {summary.blockers.map((blocker) => (
            <Pressable
              key={`${blocker.item.id}-${blocker.reason}`}
              testID={`resumo-pendencia-${blocker.item.itemCode ?? blocker.item.itemOrder}`}
              accessibilityRole="button"
              accessibilityHint="Abre o checklist neste item"
              onPress={() => openItem(blocker.item.id)}
              style={styles.blocker}>
              <View style={styles.blockerText}>
                <Text numberOfLines={2}>
                  {blocker.item.itemCode ? `${blocker.item.itemCode} — ` : ''}
                  {blocker.item.itemTitle}
                </Text>
                <Text variant="caption" tone="danger">
                  {BLOCKER_LABELS[blocker.reason]}
                </Text>
              </View>
              <Text variant="label" tone="primary">
                Abrir
              </Text>
            </Pressable>
          ))}
        </Panel>
      ) : (
        <Feedback
          testID="resumo-pronto"
          tone="success"
          message="Checklist completo. A inspeção pode ser enviada."
        />
      )}

      {locationNotice ? (
        <Feedback testID="resumo-aviso-localizacao" tone="warning" message={locationNotice} />
      ) : null}

      {failure ? <Feedback testID="resumo-falha" tone="error" message={failure} /> : null}

      <Button
        testID="resumo-concluir"
        label="Concluir inspeção"
        loading={submitting}
        disabled={!summary.canSubmit}
        onPress={submit}
        accessibilityHint={
          summary.canSubmit
            ? 'Envia a inspeção para revisão'
            : 'Resolva as pendências listadas para liberar o envio'
        }
        style={styles.submit}
      />
    </Screen>
  );
}

function Counter({ label, value, testID }: { label: string; value: number; testID: string }) {
  return (
    <View style={styles.counter}>
      <Text testID={testID} variant="title">
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  panel: {
    gap: spacing.md,
  },
  counters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  counter: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  blocked: {
    borderColor: colors.destructive,
  },
  blocker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  blockerText: {
    flex: 1,
    gap: spacing.xs,
  },
  submit: {
    marginTop: 'auto',
  },
});
