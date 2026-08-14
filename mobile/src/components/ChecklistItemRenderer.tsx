import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View, type ViewStyle } from 'react-native';

import { alpha, colors, fonts, fontSizes, radii, spacing, Text, touchTarget } from '@/design-system';
import type { Conformity, InspectionItemSnapshot, InspectionResponse } from '@/models';

import {
  isAnswered,
  readChecklistRules,
  readChoiceOptions,
  toChecklistValue,
  type ChecklistValue,
} from './checklist-value';
import { DateField } from './DateField';
import { describeStatus } from './status-catalog';

export type ChecklistItemRendererProps = {
  item: InspectionItemSnapshot;
  /** Resposta já gravada, quando existe. */
  response?: InspectionResponse;
  onChange: (value: ChecklistValue) => void;
  /** Modo leitura — inspeção enviada, aprovada ou consultada por terceiro. */
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
};

const CONFORMITY_OPTIONS: Conformity[] = ['CONFORMING', 'NON_CONFORMING', 'NOT_APPLICABLE'];

/**
 * Renderiza um item do checklist conforme o `responseType` do snapshot
 * (FE-M08, AC-CHECKLIST: o componente precisa corresponder ao tipo).
 *
 * O estado é local para o campo responder ao toque sem esperar a rede; cada
 * alteração sobe por `onChange` com o valor inteiro do item, pronto para virar
 * `InspectionResponseUpsertRequest`.
 */
export function ChecklistItemRenderer({
  item,
  response,
  onChange,
  disabled = false,
  style,
  testID,
}: ChecklistItemRendererProps) {
  const [value, setValue] = useState<ChecklistValue>(() => toChecklistValue(response));

  // Ressincroniza quando o servidor devolve outra versão da resposta — sem
  // `useEffect`, seguindo o padrão de estado derivado durante a renderização.
  const signature = `${response?.id ?? ''}:${response?.version ?? ''}`;
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setValue(toChecklistValue(response));
  }

  const rules = readChecklistRules(item);
  const answered = isAnswered(item, value);

  const showObservation = value.conformity === 'NON_CONFORMING';
  const observationRequired = showObservation && rules.observationRequiredOnFailure;
  const observationMissing =
    observationRequired && !(value.observation ?? '').trim() && !disabled;
  const evidenceRequired = showObservation && rules.evidenceRequiredOnFailure;

  function update(patch: ChecklistValue): void {
    const next = { ...value, ...patch };
    setValue(next);
    onChange(next);
  }

  return (
    <View testID={testID} style={[styles.root, style]}>
      <View style={styles.header}>
        <Text
          testID={testID ? `${testID}-indicator` : undefined}
          accessibilityLabel={answered ? 'Respondido' : 'Pendente'}
          style={[styles.indicator, answered ? styles.indicatorDone : styles.indicatorPending]}>
          {answered ? '✓' : '○'}
        </Text>

        <View style={styles.headerText}>
          <Text variant="subtitle">
            {item.itemCode ? `${item.itemCode} — ` : ''}
            {item.itemTitle}
            {item.required ? (
              <Text
                accessibilityLabel="Obrigatório"
                style={styles.required}>
                {' *'}
              </Text>
            ) : null}
          </Text>

          {item.itemDescription ? (
            <Text variant="caption" tone="muted" style={styles.description}>
              {item.itemDescription}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.control}>
        {renderControl({ item, value, disabled, update, testID })}
      </View>

      {showObservation ? (
        <View style={styles.observation}>
          <Text variant="label">
            Observação
            {observationRequired ? (
              <Text style={styles.required}>{' *'}</Text>
            ) : null}
          </Text>

          <TextInput
            testID={testID ? `${testID}-observation` : undefined}
            accessibilityLabel="Observação"
            multiline
            numberOfLines={3}
            editable={!disabled}
            placeholder="Descreva o que foi encontrado"
            placeholderTextColor={colors.mutedForeground}
            value={value.observation ?? ''}
            onChangeText={(text) => update({ observation: text })}
            style={[styles.input, styles.inputMultiline, observationMissing && styles.inputInvalid]}
          />

          {observationMissing ? (
            <Text variant="caption" tone="danger">
              Item não conforme exige observação (RN-038).
            </Text>
          ) : null}
        </View>
      ) : null}

      {evidenceRequired ? (
        <View
          testID={testID ? `${testID}-evidence-required` : undefined}
          accessibilityRole="alert"
          style={styles.evidenceNotice}>
          <Text variant="caption" style={styles.evidenceText}>
            Evidência fotográfica obrigatória para este item.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type ControlProps = {
  item: InspectionItemSnapshot;
  value: ChecklistValue;
  disabled: boolean;
  update: (patch: ChecklistValue) => void;
  testID?: string;
};

function renderControl({ item, value, disabled, update, testID }: ControlProps) {
  const controlId = testID ? `${testID}-control` : undefined;

  switch (item.responseType) {
    case 'TEXT_SHORT':
      return (
        <TextInput
          testID={controlId}
          accessibilityLabel={item.itemTitle}
          editable={!disabled}
          value={value.valueText ?? ''}
          onChangeText={(text) => update({ valueText: text })}
          placeholder="Digite a resposta"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
        />
      );

    case 'TEXT_LONG':
      return (
        <TextInput
          testID={controlId}
          accessibilityLabel={item.itemTitle}
          editable={!disabled}
          multiline
          numberOfLines={4}
          value={value.valueText ?? ''}
          onChangeText={(text) => update({ valueText: text })}
          placeholder="Digite a resposta"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, styles.inputMultiline]}
        />
      );

    case 'NUMBER':
      return (
        <TextInput
          testID={controlId}
          accessibilityLabel={item.itemTitle}
          editable={!disabled}
          keyboardType="numeric"
          inputMode="decimal"
          value={value.valueNumber == null ? '' : String(value.valueNumber)}
          onChangeText={(text) => update({ valueNumber: parseDecimal(text) })}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
        />
      );

    case 'BOOLEAN':
      return (
        <View style={styles.switchRow}>
          <Text tone={value.valueBoolean === false ? 'default' : 'muted'}>Não</Text>
          <Switch
            testID={controlId}
            accessibilityLabel={item.itemTitle}
            disabled={disabled}
            value={value.valueBoolean === true}
            onValueChange={(next) => update({ valueBoolean: next })}
            trackColor={{ false: colors.secondary, true: alpha.success15 }}
            thumbColor={value.valueBoolean === true ? colors.success : colors.mutedForeground}
          />
          <Text tone={value.valueBoolean === true ? 'default' : 'muted'}>Sim</Text>
        </View>
      );

    case 'CONFORMITY':
      return (
        <View style={styles.conformityRow}>
          {CONFORMITY_OPTIONS.map((option) => {
            const selected = value.conformity === option;
            return (
              <Pressable
                key={option}
                testID={controlId ? `${controlId}-${option}` : undefined}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={describeStatus('conformity', option).label}
                disabled={disabled}
                onPress={() => update({ conformity: option })}
                style={[
                  styles.conformityOption,
                  selected && conformityStyles[option],
                  disabled && styles.disabled,
                ]}>
                <Text
                  variant="label"
                  numberOfLines={2}
                  style={[styles.conformityLabel, selected && conformityLabelStyles[option]]}>
                  {describeStatus('conformity', option).label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );

    case 'SINGLE_CHOICE': {
      const options = readChoiceOptions(item);

      if (options.length === 0) {
        return (
          <Text variant="caption" tone="danger">
            Este item não tem alternativas configuradas.
          </Text>
        );
      }

      return (
        <View accessibilityRole="radiogroup" style={styles.choiceList}>
          {options.map((option) => {
            const selected = value.valueText === option.value;
            return (
              <Pressable
                key={option.value}
                testID={controlId ? `${controlId}-${option.value}` : undefined}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={option.label}
                disabled={disabled}
                onPress={() => update({ valueText: option.value })}
                style={[styles.choiceOption, disabled && styles.disabled]}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.choiceLabel}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    case 'DATE':
      return (
        <DateField
          testID={controlId}
          accessibilityLabel={item.itemTitle}
          disabled={disabled}
          value={value.valueDate}
          onChange={(next) => update({ valueDate: next })}
        />
      );

    default:
      // Tipo fora do MVP (RN-023): melhor avisar que renderizar um campo errado.
      return (
        <Text variant="caption" tone="danger">
          Tipo de resposta não suportado nesta versão do aplicativo.
        </Text>
      );
  }
}

/**
 * Aceita vírgula decimal — é o que o teclado numérico oferece em pt-BR.
 * Texto inválido vira `null`, não `NaN`, para não gravar lixo na resposta.
 */
export function parseDecimal(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '') return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  indicator: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * 1.5,
  },
  indicatorDone: {
    color: colors.success,
  },
  indicatorPending: {
    color: colors.mutedForeground,
  },
  required: {
    color: colors.destructive,
  },
  description: {
    marginTop: spacing.xs,
  },
  control: {
    gap: spacing.sm,
  },
  // Mesmos tokens do `Field` do design system; aqui o rótulo já é o título do
  // item, então o campo é usado sem o cabeçalho próprio do `Field`.
  input: {
    minHeight: touchTarget,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.background,
    color: colors.foreground,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: touchTarget * 2,
    textAlignVertical: 'top',
  },
  inputInvalid: {
    borderColor: colors.destructive,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: touchTarget,
  },
  conformityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  conformityOption: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  conformityLabel: {
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  choiceList: {
    gap: spacing.sm,
  },
  choiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  choiceLabel: {
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  observation: {
    gap: spacing.sm,
  },
  evidenceNotice: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: alpha.warning15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  evidenceText: {
    color: colors.warning,
  },
  disabled: {
    opacity: 0.6,
  },
});

const conformityStyles = StyleSheet.create({
  CONFORMING: {
    borderColor: colors.success,
    backgroundColor: alpha.success15,
  },
  NON_CONFORMING: {
    borderColor: colors.destructive,
    backgroundColor: alpha.destructive15,
  },
  NOT_APPLICABLE: {
    borderColor: colors.mutedForeground,
    backgroundColor: colors.muted,
  },
});

const conformityLabelStyles = StyleSheet.create({
  CONFORMING: { color: colors.success },
  NON_CONFORMING: { color: colors.destructive },
  NOT_APPLICABLE: { color: colors.foreground },
});
