import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { colors, fonts, fontSizes, radii, spacing, Text, touchTarget } from '@/design-system';

import { formatDate, parseIsoDate } from './relative-date';

export type DateFieldProps = {
  /** Data em `yyyy-MM-dd`, como o contrato usa em `valueDate`. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Campo de data.
 *
 * No aparelho usa o seletor nativo. Na web ele não existe —
 * `@react-native-community/datetimepicker` publica apenas ios, android e
 * windows —, então ali o campo vira digitação com máscara `dd/mm/aaaa`. A web
 * serve só para desenvolvimento (o alvo obrigatório é Android,
 * `docs/visao-geral.md` §1.8), mas sem isto a data ficaria impossível de
 * preencher durante o desenvolvimento.
 *
 * O valor circula como `yyyy-MM-dd` e é exibido como `dd/MM/yyyy`. A conversão
 * é feita em horário local de propósito: a data de uma manutenção é a do
 * calendário do técnico, não a do UTC.
 */
export function DateField({
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = 'Selecionar data',
  accessibilityLabel,
  testID,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);

  const selected = parseIsoDate(value ? `${value}T00:00:00` : null);
  const label = selected ? formatDate(selected) : placeholder;

  function handleChange(event: DateTimePickerEvent, date?: Date): void {
    // No Android o seletor é um diálogo: qualquer desfecho o encerra.
    if (Platform.OS !== 'ios') setOpen(false);

    if (event.type === 'dismissed' || !date) return;
    onChange(toIsoDate(date));
  }

  if (Platform.OS === 'web') {
    // `typed` guarda o que está sendo digitado enquanto ainda não forma uma
    // data válida; sem isso o campo apagaria os dígitos a cada tecla.
    const text = typed ?? (selected ? formatDate(selected) : '');

    return (
      <View style={styles.root}>
        <TextInput
          testID={testID}
          accessibilityLabel={accessibilityLabel ?? 'Data'}
          editable={!disabled}
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          placeholderTextColor={colors.mutedForeground}
          value={text}
          maxLength={10}
          onChangeText={(next) => {
            const masked = maskBrDate(next);
            setTyped(masked);

            const iso = parseBrDate(masked);
            if (iso) {
              setTyped(null);
              onChange(iso);
            } else if (masked === '') {
              onChange(null);
            }
          }}
          style={[styles.input, invalid && styles.invalid, disabled && styles.disabled]}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Selecionar data'}
        accessibilityValue={selected ? { text: label } : undefined}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.control, invalid && styles.invalid, disabled && styles.disabled]}>
        <Text tone={selected ? 'default' : 'muted'}>{label}</Text>

        {selected && !disabled ? (
          <Pressable
            testID={testID ? `${testID}-clear` : undefined}
            accessibilityRole="button"
            accessibilityLabel="Limpar data"
            hitSlop={spacing.md}
            onPress={() => onChange(null)}>
            <Text variant="caption" tone="muted">
              LIMPAR
            </Text>
          </Pressable>
        ) : null}
      </Pressable>

      {open && !disabled ? (
        <DateTimePicker
          testID={testID ? `${testID}-picker` : undefined}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          value={selected ?? new Date()}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

/** `Date` local → `yyyy-MM-dd`, sem passar por UTC. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Insere as barras conforme a pessoa digita: `14082026` → `14/08/2026`. */
export function maskBrDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * `dd/mm/aaaa` → `yyyy-MM-dd`, ou `null` enquanto a data não estiver completa
 * ou não existir no calendário (31/02, por exemplo).
 */
export function parseBrDate(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // O construtor "acerta" datas inexistentes (31/02 vira 03/03); comparar de
  // volta é o que revela isso.
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return toIsoDate(date);
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: touchTarget,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
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
  invalid: {
    borderColor: colors.destructive,
  },
  disabled: {
    opacity: 0.6,
  },
});
