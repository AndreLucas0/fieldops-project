import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, fonts, fontSizes, radii, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

/**
 * Campo de texto com rótulo, equivalente ao par `<Label>` + `<Input>` /
 * `<Textarea>` do protótipo. A borda muda de cor no foco, cumprindo o
 * `--ring` do design original.
 */

export interface FieldProps extends TextInputProps {
  label?: string;
  /** Mensagem de erro exibida junto ao campo (docs §13.9). */
  error?: string;
  hint?: string;
  multiline?: boolean;
  containerStyle?: ViewStyle;
}

export function Field({
  label,
  error,
  hint,
  multiline,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="bodyMedium" style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        accessibilityLabel={label}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
          style,
        ]}
        {...rest}
      />
      {hint && !error && (
        <Text variant="caption" color="mutedForeground">
          {hint}
        </Text>
      )}
      {error && (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
  },
  label: {
    color: colors.foreground,
  },
  input: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.foreground,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
  },
  multiline: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  focused: {
    borderColor: colors.ring,
  },
  errored: {
    borderColor: colors.destructive,
  },
});
