import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorState, LoadingSpinner, ProgressBar, StatusBadge, formatDateTime, parseIsoDate } from '@/components';
import { Button, colors, Panel, Screen, spacing, Text } from '@/design-system';
import {
  latestRejection,
  primaryAction,
  readItemsToCorrect,
} from '@/features/inspections/inspection-actions';
import { useInspectionDetail } from '@/features/inspections/use-inspection-detail';

/**
 * FE-M06 — Detalhes da inspeção.
 *
 * Apresenta a inspeção antes de iniciar, durante a execução ou depois de
 * concluída. Qual botão aparece depende do estado (§17.1); nos estados finais
 * a tela é somente leitura.
 */
export default function InspectionDetailScreen() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const { inspection, places, progress, loading, error, reload } = useInspectionDetail(inspectionId);

  if (loading) {
    return <LoadingSpinner testID="detalhe-loading" message="Carregando a inspeção…" />;
  }

  if (error || !inspection) {
    return (
      <ErrorState
        testID="detalhe-error"
        message={error?.message ?? 'Inspeção não encontrada.'}
        requestId={error?.requestId ?? null}
        onRetry={reload}
      />
    );
  }

  // Referência estável para as funções abaixo: o estreitamento do `if` acima
  // não atravessa a fronteira das closures.
  const detail = inspection;

  const action = primaryAction(detail.status);
  const rejection = latestRejection(detail.reviews);
  const itemsToCorrect = readItemsToCorrect(rejection);
  const scheduled = parseIsoDate(detail.scheduledFor);

  function handleAction(): void {
    if (!action) return;

    if (action.action === 'start') {
      router.push({
        pathname: '/inspections/[inspectionId]/start',
        params: { inspectionId: detail.id },
      });
      return;
    }

    // Continuar e corrigir abrem o mesmo checklist; a diferença é o destaque
    // nos itens apontados pelo supervisor.
    router.push({
      pathname: '/inspections/[inspectionId]/checklist',
      params: {
        inspectionId: detail.id,
        ...(itemsToCorrect.length > 0 ? { highlight: itemsToCorrect.join(',') } : {}),
      },
    });
  }

  return (
    <Screen testID="detalhe-screen" insetTop={false} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="title">{detail.title?.trim() || `Inspeção #${detail.id.slice(0, 8)}`}</Text>

        <View style={styles.badges}>
          <StatusBadge value={detail.status} context="inspection" />
          <StatusBadge value={detail.priority} context="priority" />
        </View>
      </View>

      <Panel testID="detalhe-local" style={styles.panel}>
        <Field label="Cliente" value={places.clientName} />
        <Field label="Local" value={places.siteName} />
        <Field label="Equipamento" value={places.equipmentName} />
        <Field label="Agendada para" value={scheduled ? formatDateTime(scheduled) : null} />
      </Panel>

      {detail.instructions ? (
        <Panel testID="detalhe-instrucoes" style={styles.panel}>
          <Text variant="label" tone="muted">
            Instruções
          </Text>
          <Text>{detail.instructions}</Text>
        </Panel>
      ) : null}

      <Panel testID="detalhe-progresso" style={styles.panel}>
        <Text variant="label" tone="muted">
          Progresso do checklist
        </Text>
        <ProgressBar
          testID="detalhe-progress"
          answered={progress.answered}
          total={progress.total}
        />
      </Panel>

      {rejection ? (
        <Panel testID="detalhe-reprovacao" style={[styles.panel, styles.rejected]}>
          <Text variant="label" tone="danger">
            Reprovada na revisão {rejection.reviewCycle}
          </Text>
          <Text>{rejection.reason ?? 'O supervisor não detalhou o motivo.'}</Text>

          {itemsToCorrect.length > 0 ? (
            <Text variant="caption" tone="muted">
              {itemsToCorrect.length} item(ns) apontado(s) para correção.
            </Text>
          ) : null}
        </Panel>
      ) : null}

      {detail.nonConformities && detail.nonConformities.length > 0 ? (
        <Panel testID="detalhe-nc" style={styles.panel}>
          <Text variant="label" tone="muted">
            Não conformidades ({detail.nonConformities.length})
          </Text>

          {detail.nonConformities.map((nc) => (
            <View key={nc.id} style={styles.nc}>
              <Text numberOfLines={2}>{nc.title}</Text>
              <StatusBadge value={nc.severity} context="severity" size="sm" />
            </View>
          ))}
        </Panel>
      ) : null}

      {action ? (
        <Button
          testID="detalhe-acao"
          label={action.label}
          accessibilityHint={action.hint}
          onPress={handleAction}
          style={styles.action}
        />
      ) : (
        <Text testID="detalhe-somente-leitura" variant="caption" tone="muted" style={styles.action}>
          Esta inspeção está em modo de consulta. Não há ações disponíveis neste estado.
        </Text>
      )}
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  panel: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  rejected: {
    borderColor: colors.destructive,
  },
  nc: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  action: {
    marginTop: 'auto',
  },
});
