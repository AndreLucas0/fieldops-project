import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, fontSizes, radii, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

/**
 * Botão do produto, com as mesmas variantes do shadcn/ui usadas no protótipo
 * (default, secondary, outline, ghost, destructive).
 */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Ícone à esquerda do rótulo. */
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor[variant]} />
      ) : (
        icon && <View style={styles.icon}>{icon}</View>
      )}
      <Text style={[styles.label, labelSize[size], { color: textColor[variant] }]}>{title}</Text>
    </Pressable>
  );
}

/** Cor do rótulo e dos ícones por variante, exportada para os chamadores. */
export const textColor: Record<Variant, string> = {
  primary: colors.primaryForeground,
  secondary: colors.secondaryForeground,
  outline: colors.foreground,
  ghost: colors.mutedForeground,
  destructive: colors.destructiveForeground,
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.destructive },
};

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: spacing.md },
  md: { height: touchTarget, paddingHorizontal: spacing.lg },
  lg: { height: 52, paddingHorizontal: spacing.xl },
};

const labelSize = StyleSheet.create({
  sm: { fontSize: fontSizes.xs },
  md: { fontSize: fontSizes.sm },
  lg: { fontSize: fontSizes.base },
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  label: {
    fontFamily: fonts.bold,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
