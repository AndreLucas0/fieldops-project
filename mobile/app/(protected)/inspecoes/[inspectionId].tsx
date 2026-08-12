import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileCheck2, TriangleAlert } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  colors,
  ErrorState,
  LoadingState,
  Panel,
  ProgressBar,
  Screen,
  spacing,
  Text,
  textColor,
} from '@/design-system';
import { ChecklistItemCard } from '@/features/checklist/ChecklistItemCard';
import {
  STATUS_LABEL,
  summarize,
  SYNC_STATUS_LABEL,
  type Answer,
} from '@/domain/inspection';
import {
  useCompleteInspection,
  useInspection,
  useSaveAnswers,
} from '@/hooks/use-inspection-data';

/**
 * Execução do checklist — porte de `_authenticated/inspecoes.$id.tsx`.
 *
 * As respostas vivem em estado local enquanto a inspeção é preenchida; o
 * "salvar" as persiste. É o esboço do fluxo de §10.14.2, que na Sprint 6 passa
 * a gravar no SQLite a cada alteração e a enfileirar a operação na outbox.
 */
export default function RunInspectionScreen() {
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const router = useRouter();

  const { data: inspection, isLoading, error } = useInspection(inspectionId);
  const saveAnswers = useSaveAnswers(inspectionId);
  const completeInspection = useCompleteInspection(inspectionId);

  const [answers, setAnswers] = useState<Answer[]>([]);
  const hydrated = useRef(false);

  // Hidrata uma única vez: recarregar a query depois de salvar não pode
  // sobrescrever o que o técnico digitou desde então.
  useEffect(() => {
    if (inspection && !hydrated.current) {
      setAnswers(inspection.answers);
      hydrated.current = true;
    }
  }, [inspection]);

  // Memoizado para não recriar a lista a cada tecla digitada — o `?? []`
  // sozinho devolveria um array novo em toda renderização.
  const items = useMemo(() => inspection?.itemsSnapshot ?? [], [inspection]);
  const summary = useMemo(() => summarize(items, answers), [items, answers]);

  // RN-043 — depois de concluída, a inspeção fica bloqueada para edição.
  const readOnly = !!inspection && inspection.status !== 'IN_PROGRESS' && inspection.status !== 'ASSIGNED';
  const busy = saveAnswers.isPending || completeInspection.isPending;

  function updateAnswer(itemId: string, patch: Partial<Answer>) {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.itemId === itemId);
      if (!existing) return [...prev, { itemId, ...patch }];
      return prev.map((a) => (a.itemId === itemId ? { ...a, ...patch } : a));
    });
  }

  function handleSaveDraft() {
    saveAnswers.mutate(answers, {
      onError: () => Alert.alert('Erro', 'Não foi possível salvar as respostas.'),
    });
  }

  function handleComplete() {
    // RN-037 / RN-038 / RN-039 — a conclusão é bloqueada enquanto houver
    // pendência; o técnico precisa ver qual item impede, não só o total.
    if (summary.blockers.length > 0) return;

    Alert.alert('Concluir inspeção', 'Depois de concluída, as respostas ficam bloqueadas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Concluir',
        onPress: () =>
          completeInspection.mutate(answers, {
            onSuccess: () => router.replace('/historico'),
            onError: () => Alert.alert('Erro', 'Não foi possível concluir a inspeção.'),
          }),
      },
    ]);
  }

  const identification =
    [inspection?.equipment, inspection?.site].filter(Boolean).join(' • ') || 'Checklist';

  return (
    <Screen title={inspection?.templateTitle ?? 'Inspeção'} subtitle={identification} showBack>
      {error ? (
        <ErrorState message="Não foi possível carregar a inspeção." />
      ) : isLoading ? (
        <LoadingState />
      ) : !inspection ? (
        <ErrorState message="Inspeção não encontrada." />
      ) : (
        <>
          <Panel style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text variant="caption" color="mutedForeground">
                {summary.answered}/{summary.total} respondidos
              </Text>
              <Text variant="caption" color="primary">
                {summary.score}% conforme
              </Text>
            </View>
            <ProgressBar value={summary.progress} />
            <View style={styles.progressBadges}>
              <Badge label={STATUS_LABEL[inspection.status]} />
              <Badge
                label={SYNC_STATUS_LABEL[inspection.syncStatus]}
                tone={inspection.syncStatus === 'SYNCED' ? 'success' : 'warning'}
              />
              {summary.nonConforming > 0 && (
                <Badge label={`${summary.nonConforming} não conf.`} tone="destructive" />
              )}
            </View>
          </Panel>

          <View style={styles.list}>
            {items.map((item, index) => (
              <ChecklistItemCard
                key={item.id}
                index={index}
                item={item}
                answer={answers.find((a) => a.itemId === item.id) ?? { itemId: item.id }}
                readOnly={readOnly}
                onChange={(patch) => updateAnswer(item.id, patch)}
              />
            ))}
          </View>

          {readOnly ? (
            <Panel style={styles.lockedNotice}>
              <Text variant="bodyMedium" center>
                Inspeção {STATUS_LABEL[inspection.status].toLowerCase()}
              </Text>
              <Text variant="caption" color="mutedForeground" center>
                As respostas ficam somente leitura até uma eventual solicitação de correção.
              </Text>
            </Panel>
          ) : (
            <View style={styles.actions}>
              {summary.blockers.length > 0 && (
                <Panel style={styles.blockers}>
                  <View style={styles.blockersHeader}>
                    <TriangleAlert size={16} color={colors.warning} />
                    <Text variant="bodyMedium" color="warning">
                      {summary.blockers.length}{' '}
                      {summary.blockers.length === 1 ? 'pendência' : 'pendências'} para concluir
                    </Text>
                  </View>
                  {summary.blockers.slice(0, 5).map((blocker, index) => (
                    <Text
                      key={`${blocker.itemId}-${index}`}
                      variant="caption"
                      color="mutedForeground"
                    >
                      • {blocker.itemTitle} — {blocker.reason}
                    </Text>
                  ))}
                  {summary.blockers.length > 5 && (
                    <Text variant="caption" color="mutedForeground">
                      e mais {summary.blockers.length - 5}…
                    </Text>
                  )}
                </Panel>
              )}

              <Button
                title="Salvar rascunho"
                variant="outline"
                loading={saveAnswers.isPending}
                disabled={busy}
                onPress={handleSaveDraft}
              />
              <Button
                title="Concluir inspeção"
                size="lg"
                icon={<FileCheck2 size={20} color={textColor.primary} />}
                loading={completeInspection.isPending}
                disabled={busy || summary.blockers.length > 0}
                onPress={handleComplete}
              />
              <Text variant="caption" color="mutedForeground" center>
                O envio ao servidor pode permanecer pendente até haver conexão.
              </Text>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  list: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  blockers: {
    padding: spacing.lg,
    gap: spacing.xs + 2,
  },
  blockersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  lockedNotice: {
    padding: spacing.xl,
    gap: spacing.xs,
  },
});
