import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { alpha, colors, radii, spacing, Text, touchTarget } from '@/design-system';

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
}

export type FilterChipsProps<T extends string> = {
  /** Título curto da linha de chips (ex.: "Estado"). */
  label: string;
  options: readonly FilterChipOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Linha rolável de chips de filtro.
 *
 * O chip selecionado muda de cor **e** ganha um marcador textual, porque
 * `docs/aplicativo-mobile.md` §13.9 proíbe comunicar estado só por cor; o
 * estado também vai em `accessibilityState.selected` para o leitor de tela.
 */
export function FilterChips<T extends string>({
  label,
  options,
  selected,
  onToggle,
  style,
  testID,
}: FilterChipsProps<T>) {
  return (
    <View style={[styles.root, style]} testID={testID}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}>
        {options.map((option) => {
          const active = selected.includes(option.value);

          return (
            <Pressable
              key={option.value}
              testID={testID ? `${testID}-${option.value}` : undefined}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${label}: ${option.label}`}
              hitSlop={spacing.xs}
              onPress={() => onToggle(option.value)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.chipPressed,
              ]}>
              <Text
                variant="label"
                numberOfLines={1}
                style={active ? styles.chipLabelActive : styles.chipLabel}>
                {active ? '✓ ' : ''}
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  chip: {
    minHeight: touchTarget - spacing.md,
    justifyContent: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: alpha.primary15,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipLabel: {
    color: colors.mutedForeground,
  },
  chipLabelActive: {
    color: colors.primary,
  },
});
