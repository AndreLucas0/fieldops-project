import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, radii, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Texto lido por leitores de tela quando `label` não basta. */
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  // Enquanto carrega o botão continua visível, mas não aceita um segundo toque:
  // evita duas tentativas de login para a mesma ação.
  const isInactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isInactive && styles.pressed,
        isInactive && styles.inactive,
        style,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            testID={testID ? `${testID}-loading` : undefined}
            size="small"
            color={variant === 'primary' ? colors.primaryForeground : colors.foreground}
          />
        ) : null}
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.base,
  },
  pressed: {
    opacity: 0.85,
  },
  inactive: {
    opacity: 0.6,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.primaryForeground },
  secondary: { color: colors.secondaryForeground },
  outline: { color: colors.foreground },
  ghost: { color: colors.mutedForeground },
});
