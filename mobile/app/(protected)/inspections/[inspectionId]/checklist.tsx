import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorState, LoadingSpinner, ProgressBar, SectionAccordion } from '@/components';
import { Button, colors, Feedback, spacing, Text } from '@/design-system';
import { ChecklistItemCard } from '@/features/checklist/ChecklistItemCard';
import { sectionProgress } from '@/features/checklist/checklist-sections';
import { saveStateOf, useChecklist } from '@/features/checklist/use-checklist';
import { useInspectionDetail } from '@/features/inspections/use-inspection-detail';
import type { InspectionItemSnapshot } from '@/models';

/** Estados em que o checklist aceita edição. */
const EDITABLE_STATUSES = ['IN_PROGRESS', 'REJECTED'];

/**
 * FE-M08 — Checklist.
 *
 * A tela principal do técnico. Cada resposta vai direto para a API; o estado
 * de gravação aparece por item, e o progresso é recalculado a cada alteração.
 */
export default function ChecklistScreen() {
  const router = useRouter();
  const { inspectionId, highlight, focus } = useLocalSearchParams<{
    inspectionId: string;
    /** Itens apontados na reprovação — destaque de correção. */
    highlight?: string;
    /** Item vindo da lista de pendências do resumo — rola até ele. */
    focus?: string;
  }>();

  const { inspection, loading, error, reload } = useInspectionDetail(inspectionId);
  const checklist = useChecklist(inspection);

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef(new Map<string, number>());
  /**
   * Seções recolhidas. Todas começam abertas: o técnico veio aqui para
   * responder tudo, e abrir uma a uma seria trabalho extra.
   */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(focus ?? null);
  /** Garante que a rolagem automática para o item focado aconteça uma só vez. */
  const scrolledToFocus = useRef(false);

  const itemsToCorrect = new Set(highlight ? highlight.split(',').filter(Boolean) : []);

  if (loading) {
    return <LoadingSpinner testID="checklist-loading" message="Carregando o checklist…" />;
  }

  if (error || !inspection) {
    return (
      <ErrorState
        testID="checklist-error"
        message={error?.message ?? 'Inspeção não encontrada.'}
        requestId={error?.requestId ?? null}
        onRetry={reload}
      />
    );
  }

  const detail = inspection;
  const readOnly = !EDITABLE_STATUSES.includes(detail.status);

  /**
   * Leva à primeira pendência: abre a seção dela e rola até lá. O deslocamento
   * é o da seção, não o do item — é o que dá para medir com confiança dentro
   * de um acordeão que pode estar fechado.
   */
  function goToPending(): void {
    const target = checklist.pending[0];
    if (!target) return;

    const section = checklist.sections.find((entry) =>
      entry.items.some((item) => item.id === target.id),
    );
    if (!section) return;

    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(section.key);
      return next;
    });
    setFocusedItemId(target.id);

    const offset = sectionOffsets.current.get(section.key);
    if (offset != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, offset - spacing.lg), animated: true });
    }
  }

  function rememberOffset(key: string, event: LayoutChangeEvent): void {
    sectionOffsets.current.set(key, event.nativeEvent.layout.y);

    // Chegou do resumo apontando um item: rola até ele quando a posição da
    // seção correspondente ficar conhecida.
    if (!focusedItemId || scrolledToFocus.current) return;

    const section = checklist.sections.find(
      (entry) => entry.key === key && entry.items.some((item) => item.id === focusedItemId),
    );
    if (!section) return;

    scrolledToFocus.current = true;
    scrollRef.current?.scrollTo({
      y: Math.max(0, event.nativeEvent.layout.y - spacing.lg),
      animated: true,
    });
  }

  function openEvidence(item: InspectionItemSnapshot): void {
    // A evidência se liga à resposta; sem resposta gravada ainda, o vínculo
    // fica só com o item e a tela de captura resolve o resto.
    const responseId = checklist.responses.get(item.id)?.id;

    router.push({
      pathname: '/inspections/[inspectionId]/evidence',
      params: {
        inspectionId: detail.id,
        inspectionItemId: item.id,
        ...(responseId ? { responseId } : {}),
      },
    });
  }

  function openNonConformity(item: InspectionItemSnapshot): void {
    router.push({
      pathname: '/inspections/[inspectionId]/non-conformities',
      params: { inspectionId: detail.id, inspectionItemId: item.id },
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.progressBar}>
        <ProgressBar
          testID="checklist-progress"
          answered={checklist.progress.answered}
          total={checklist.progress.total}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        testID="checklist-screen"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {readOnly ? (
          <Feedback
            testID="checklist-somente-leitura"
            tone="info"
            message="Esta inspeção não está em execução. As respostas estão em modo de consulta."
          />
        ) : null}

        {itemsToCorrect.size > 0 ? (
          <Feedback
            testID="checklist-aviso-correcao"
            tone="warning"
            message={`O supervisor apontou ${itemsToCorrect.size} item(ns) para correção. Eles estão destacados abaixo.`}
          />
        ) : null}

        {checklist.sections.map((section) => {
          const progress = sectionProgress(section, checklist.values);

          return (
            <View key={section.key} onLayout={(event) => rememberOffset(section.key, event)}>
              <SectionAccordion
                testID={`secao-${section.order}`}
                title={section.title}
                subtitle={section.description}
                itemCount={progress.total}
                answeredCount={progress.answered}
                expanded={!collapsed.has(section.key)}
                onToggle={(open) =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (open) next.delete(section.key);
                    else next.add(section.key);
                    return next;
                  })
                }>
                {section.items.map((item) => (
                  <ChecklistItemCard
                    key={item.id}
                    testID={`item-${item.itemCode ?? item.itemOrder}`}
                    item={item}
                    response={checklist.responses.get(item.id)}
                    value={checklist.values.get(item.id) ?? {}}
                    saveState={saveStateOf(checklist.saveStates, item.id)}
                    toCorrect={itemsToCorrect.has(item.id)}
                    focused={focusedItemId === item.id}
                    disabled={readOnly}
                    onChange={(value) => checklist.change(item, value)}
                    onAddEvidence={() => openEvidence(item)}
                    onRegisterNonConformity={() => openNonConformity(item)}
                  />
                ))}
              </SectionAccordion>
            </View>
          );
        })}

        {checklist.pending.length > 0 ? (
          <Text testID="checklist-pendencias" variant="caption" tone="muted" style={styles.hint}>
            {checklist.pending.length} item(ns) obrigatório(s) ainda sem resposta.
          </Text>
        ) : null}
      </ScrollView>

      {!readOnly ? (
        <View style={styles.footer}>
          <Button
            testID="checklist-ir-pendencias"
            label="Ir para pendências"
            variant="outline"
            disabled={checklist.pending.length === 0}
            onPress={goToPending}
            style={styles.footerButton}
          />

          <Button
            testID="checklist-resumo"
            label="Ver resumo"
            onPress={async () => {
              // O que estiver em debounce precisa chegar antes do resumo.
              await checklist.flush();
              router.push({
                pathname: '/inspections/[inspectionId]/summary',
                params: { inspectionId: detail.id },
              });
            }}
            style={styles.footerButton}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  hint: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  footerButton: {
    flex: 1,
  },
});
