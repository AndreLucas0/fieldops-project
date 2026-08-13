import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, fontSizes, radii, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

export type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Mensagem de erro exibida logo abaixo do campo (docs §13.9). */
  error?: string | null;
  /** Renderiza o campo como senha, com ação de exibir/ocultar. */
  secure?: boolean;
  testID?: string;
};

export function Field({ label, error, secure = false, testID, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const errorId = testID ? `${testID}-error` : undefined;

  return (
    <View style={styles.root}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>

      <View style={[styles.inputWrapper, focused && styles.focused, !!error && styles.invalid]}>
        <TextInput
          {...inputProps}
          testID={testID}
          accessibilityLabel={label}
          // O RN não expõe estado "inválido" em campos de texto; a dica é o que
          // faz o leitor de tela anunciar o erro junto do campo.
          accessibilityHint={error ?? inputProps.accessibilityHint}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={colors.mutedForeground}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          style={styles.input}
        />

        {secure ? (
          <Pressable
            testID={testID ? `${testID}-toggle` : undefined}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar senha' : 'Exibir senha'}
            hitSlop={spacing.md}
            onPress={() => setRevealed((value) => !value)}
            style={styles.toggle}>
            <Text variant="caption" tone="muted">
              {revealed ? 'OCULTAR' : 'EXIBIR'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text testID={errorId} variant="caption" tone="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  label: {
    color: colors.foreground,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  focused: {
    borderColor: colors.ring,
  },
  invalid: {
    borderColor: colors.destructive,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    paddingVertical: spacing.md,
  },
  toggle: {
    paddingLeft: spacing.md,
  },
  error: {
    marginTop: -spacing.xs,
  },
});
