import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { colors, radii, spacing, Text, touchTarget } from '@/design-system';

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
 * Campo de data com seletor nativo.
 *
 * O valor circula como `yyyy-MM-dd` (formato `date` do contrato) e é exibido
 * como `dd/MM/yyyy`. A conversão é feita em horário local de propósito: a data
 * de uma manutenção é a do calendário do técnico, não a do UTC.
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

  const selected = parseIsoDate(value ? `${value}T00:00:00` : null);
  const label = selected ? formatDate(selected) : placeholder;

  function handleChange(event: DateTimePickerEvent, date?: Date): void {
    // No Android o seletor é um diálogo: qualquer desfecho o encerra.
    if (Platform.OS !== 'ios') setOpen(false);

    if (event.type === 'dismissed' || !date) return;
    onChange(toIsoDate(date));
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
  invalid: {
    borderColor: colors.destructive,
  },
  disabled: {
    opacity: 0.6,
  },
});
