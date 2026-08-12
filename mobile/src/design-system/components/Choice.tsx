import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { alpha, colors, fonts, fontSizes, radii, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

/**
 * Controles de seleção do checklist e do construtor de modelos.
 *
 * O protótipo usava Radix (`<Checkbox>`, botões com `data-on`); aqui são
 * `Pressable`s com estado de acessibilidade explícito.
 */

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked && <Check size={12} color={colors.primaryForeground} strokeWidth={3} />}
      </View>
      <Text variant="caption" color="mutedForeground" style={styles.checkboxLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Cor de fundo quando selecionado; por padrão usa a primária. */
  activeColor?: string;
  activeTextColor?: string;
}

/**
 * Grupo de opções mutuamente exclusivas. Serve tanto ao seletor de
 * conformidade (Conforme / Não conf. / N/A) quanto ao SINGLE_CHOICE.
 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
  columns,
  style,
}: {
  options: ChipOption<T>[];
  value: T | null | undefined;
  onChange: (next: T) => void;
  disabled?: boolean;
  /** Divide as opções em colunas de largura igual. */
  columns?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.group, style]}>
      {options.map((option) => {
        const active = value === option.value;
        const activeBg = option.activeColor ?? colors.primary;
        const activeFg = option.activeTextColor ?? colors.primaryForeground;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled: !!disabled }}
            accessibilityLabel={option.label}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              columns && styles.chipColumn,
              active && { backgroundColor: activeBg, borderColor: activeBg },
              pressed && !disabled && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            {option.icon}
            <Text
              style={[
                styles.chipLabel,
                { color: active ? activeFg : colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    minHeight: touchTarget - 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha.overlay,
  },
  chipColumn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  chipLabel: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xs,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});
