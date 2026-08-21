import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState, ErrorState, LoadingSpinner, StatusBadge, statusLabel } from '@/components';
import { Button, colors, Feedback, Field, Panel, Screen, spacing, Text } from '@/design-system';
import {
  EMPTY_DRAFT,
  SEVERITY_ORDER,
  hasErrors,
  toDraft,
  validateDraft,
  type NonConformityDraft,
  type NonConformityErrors,
} from '@/features/non-conformities/non-conformity-form';
import { useNonConformities } from '@/features/non-conformities/use-non-conformities';
import { useInspectionDetail } from '@/features/inspections/use-inspection-detail';
import type { NonConformity, Severity } from '@/models';

/**
 * FE-M10 — Não conformidades da inspeção.
 *
 * Lista o que já foi apontado e registra novos apontamentos. Quando aberta a
 * partir de um item do checklist, o vínculo com o item vem por parâmetro.
 */
export default function NonConformitiesScreen() {
  const router = useRouter();
  const { inspectionId, inspectionItemId, responseId } = useLocalSearchParams<{
    inspectionId: string;
    inspectionItemId?: string;
    responseId?: string;
  }>();

  const { inspection, loading, error, reload } = useInspectionDetail(inspectionId);
  const nonConformities = useNonConformities(inspectionId, inspection?.nonConformities ?? []);

  const [draft, setDraft] = useState<NonConformityDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<NonConformityErrors>({});
  const [editing, setEditing] = useState<NonConformity | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  if (loading) {
    return <LoadingSpinner testID="nc-loading" message="Carregando as não conformidades…" />;
  }

  if (error || !inspection) {
    return (
      <ErrorState
        testID="nc-error"
        message={error?.message ?? 'Inspeção não encontrada.'}
        requestId={error?.requestId ?? null}
        onRetry={reload}
      />
    );
  }

  const detail = inspection;
  const readOnly = detail.status !== 'IN_PROGRESS';

  function openForm(target?: NonConformity): void {
    setEditing(target ?? null);
    setDraft(target ? toDraft(target) : EMPTY_DRAFT);
    setErrors({});
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
  }

  async function save(): Promise<void> {
    const found = validateDraft(draft);
    setErrors(found);
    if (hasErrors(found)) return;

    const saved = editing
      ? await nonConformities.update(editing.id, draft)
      : await nonConformities.create(draft, { inspectionItemId, responseId });

    if (saved) closeForm();
  }

  function openEvidence(nonConformity: NonConformity): void {
    router.push({
      pathname: '/evidence/capture',
      params: {
        inspectionId: detail.id,
        origin: 'non-conformities',
        nonConformityId: nonConformity.id,
      },
    });
  }

  return (
    <Screen testID="nc-screen" insetTop={false} contentStyle={styles.content}>
      {readOnly ? (
        <Feedback
          testID="nc-somente-leitura"
          tone="info"
          message="Esta inspeção não está em execução. As não conformidades estão em consulta."
        />
      ) : null}

      {inspectionItemId && !formOpen ? (
        <Text testID="nc-contexto" variant="caption" tone="muted">
          Novo apontamento será vinculado ao item selecionado no checklist.
        </Text>
      ) : null}

      {nonConformities.error ? (
        <Feedback testID="nc-falha" tone="error" message={nonConformities.error.message} />
      ) : null}

      {formOpen ? (
        <Panel testID="nc-formulario" tone="raised" style={styles.form}>
          <Text variant="subtitle">
            {editing ? 'Editar não conformidade' : 'Registrar não conformidade'}
          </Text>

          <Field
            testID="nc-titulo"
            label="Título"
            placeholder="Resumo do que foi encontrado"
            value={draft.title}
            error={errors.title}
            onChangeText={(title) => {
              setDraft((current) => ({ ...current, title }));
              if (errors.title) setErrors((current) => ({ ...current, title: undefined }));
            }}
          />

          <View style={styles.severity}>
            <Text variant="label">Severidade</Text>
            <View style={styles.severityRow}>
              {SEVERITY_ORDER.map((severity) => (
                <SeverityOption
                  key={severity}
                  severity={severity}
                  selected={draft.severity === severity}
                  onPress={() => setDraft((current) => ({ ...current, severity }))}
                />
              ))}
            </View>
          </View>

          <Field
            testID="nc-descricao"
            label="Descrição"
            placeholder="Detalhe o problema e o risco"
            multiline
            numberOfLines={4}
            value={draft.description}
            error={errors.description}
            onChangeText={(description) => {
              setDraft((current) => ({ ...current, description }));
              if (errors.description) {
                setErrors((current) => ({ ...current, description: undefined }));
              }
            }}
          />

          <View style={styles.formActions}>
            <Button
              testID="nc-cancelar"
              label="Cancelar"
              variant="ghost"
              disabled={nonConformities.saving}
              onPress={closeForm}
              style={styles.formButton}
            />
            <Button
              testID="nc-salvar"
              label={editing ? 'Salvar alterações' : 'Registrar'}
              loading={nonConformities.saving}
              onPress={save}
              style={styles.formButton}
            />
          </View>
        </Panel>
      ) : null}

      {nonConformities.items.length === 0 && !formOpen ? (
        <EmptyState
          testID="nc-vazio"
          title="Nenhuma não conformidade"
          message="Registre um apontamento quando encontrar algo fora do esperado."
          actionLabel={readOnly ? undefined : 'Registrar não conformidade'}
          onAction={() => openForm()}
        />
      ) : (
        <View style={styles.list}>
          {nonConformities.items.map((item) => (
            <Panel key={item.id} testID={`nc-item-${item.id}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text variant="subtitle" numberOfLines={2} style={styles.cardTitle}>
                  {item.title}
                </Text>
                <StatusBadge value={item.severity} context="severity" size="sm" />
              </View>

              <Text variant="caption" tone="muted">
                {item.description}
              </Text>

              <View style={styles.cardFooter}>
                <StatusBadge value={item.status} context="nonConformity" size="sm" />

                {!readOnly ? (
                  <View style={styles.cardActions}>
                    <Button
                      testID={`nc-editar-${item.id}`}
                      label="Editar"
                      variant="outline"
                      onPress={() => openForm(item)}
                      style={styles.cardButton}
                    />
                    <Button
                      testID={`nc-evidencia-${item.id}`}
                      label="Evidência"
                      variant="outline"
                      onPress={() => openEvidence(item)}
                      style={styles.cardButton}
                    />
                  </View>
                ) : null}
              </View>
            </Panel>
          ))}
        </View>
      )}

      {!formOpen && !readOnly && nonConformities.items.length > 0 ? (
        <Button
          testID="nc-nova"
          label="Registrar não conformidade"
          onPress={() => openForm()}
          style={styles.newButton}
        />
      ) : null}
    </Screen>
  );
}

function SeverityOption({
  severity,
  selected,
  onPress,
}: {
  severity: Severity;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`nc-severidade-${severity}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Severidade ${statusLabel('severity', severity)}`}
      onPress={onPress}
      style={[styles.severityOption, selected && styles.severityOptionSelected]}>
      <StatusBadge value={severity} context="severity" size="sm" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  severity: {
    gap: spacing.sm,
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  severityOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.xs,
  },
  severityOptionSelected: {
    borderColor: colors.primary,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formButton: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 0,
  },
  newButton: {
    marginTop: 'auto',
  },
});
