import { StyleSheet, View } from 'react-native';

import { ChecklistItemRenderer, type ChecklistValue } from '@/components';
import { alpha, Button, colors, radii, spacing, Text } from '@/design-system';
import type { InspectionItemSnapshot, InspectionResponse } from '@/models';

import type { ItemSaveState } from './use-checklist';

export type ChecklistItemCardProps = {
  item: InspectionItemSnapshot;
  response?: InspectionResponse;
  value: ChecklistValue;
  saveState: ItemSaveState;
  /** Apontado pelo supervisor na reprovação — destaque visual. */
  toCorrect?: boolean;
  /** Alvo do "ir para pendências". */
  focused?: boolean;
  disabled?: boolean;
  onChange: (value: ChecklistValue) => void;
  onAddEvidence: () => void;
  onRegisterNonConformity: () => void;
  testID?: string;
};

/**
 * Um item do checklist com o que cerca a resposta: estado de gravação, ações
 * de evidência e não conformidade, e o destaque de correção.
 *
 * O campo em si é do `ChecklistItemRenderer`; aqui fica só o entorno.
 */
export function ChecklistItemCard({
  item,
  response,
  value,
  saveState,
  toCorrect = false,
  focused = false,
  disabled = false,
  onChange,
  onAddEvidence,
  onRegisterNonConformity,
  testID,
}: ChecklistItemCardProps) {
  const showNonConformityAction = value.conformity === 'NON_CONFORMING';

  return (
    <View
      testID={testID}
      style={[styles.root, toCorrect && styles.toCorrect, focused && styles.focused]}>
      {toCorrect ? (
        <View testID={testID ? `${testID}-corrigir` : undefined} style={styles.correctionTag}>
          <Text variant="caption" style={styles.correctionText}>
            ⚠ Corrigir este item
          </Text>
        </View>
      ) : null}

      <ChecklistItemRenderer
        testID={testID ? `${testID}-item` : undefined}
        item={item}
        response={response}
        disabled={disabled}
        onChange={onChange}
      />

      <View style={styles.footer}>
        <SaveIndicator testID={testID ? `${testID}-save` : undefined} state={saveState} />

        {!disabled ? (
          <View style={styles.actions}>
            <Button
              testID={testID ? `${testID}-evidencia` : undefined}
              label="Evidência"
              variant="outline"
              onPress={onAddEvidence}
              style={styles.actionButton}
            />

            {showNonConformityAction ? (
              <Button
                testID={testID ? `${testID}-nc` : undefined}
                label="Registrar NC"
                variant="outline"
                onPress={onRegisterNonConformity}
                style={styles.actionButton}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Rótulo textual do estado de gravação — nunca só cor (§13.9). */
function SaveIndicator({ state, testID }: { state: ItemSaveState; testID?: string }) {
  switch (state.status) {
    case 'saving':
      return (
        <Text testID={testID} variant="caption" tone="muted">
          Salvando…
        </Text>
      );
    case 'saved':
      return (
        <Text testID={testID} variant="caption" tone="success">
          ✓ Salvo
        </Text>
      );
    case 'invalid':
    case 'error':
      return (
        <Text testID={testID} variant="caption" tone="danger" style={styles.saveMessage}>
          {state.message ?? 'Não foi possível salvar.'}
        </Text>
      );
    default:
      return <View testID={testID} />;
  }
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  toCorrect: {
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: alpha.destructive15,
    padding: spacing.sm,
  },
  focused: {
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.sm,
  },
  correctionTag: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    backgroundColor: alpha.destructive15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  correctionText: {
    color: colors.destructive,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xs,
  },
  saveMessage: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 0,
  },
});
