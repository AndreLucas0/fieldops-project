import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { colors, gradients, radii, shadows } from '../tokens';

/**
 * Superfície elevada do produto — equivale ao utilitário `@utility panel` do
 * protótipo: degradê de aço, borda de 1px e sombra difusa.
 */
export interface PanelProps extends ViewProps {
  /** `StyleProp` para aceitar estilos condicionais (`pressed && styles.x`). */
  style?: StyleProp<ViewStyle>;
  /** Realce de seleção, usado na escolha do modelo na nova inspeção. */
  selected?: boolean;
}

export function Panel({ children, style, selected, ...rest }: PanelProps) {
  return (
    <LinearGradient
      colors={[...gradients.steel]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.panel, selected && styles.selected, style]}
      {...rest}
    >
      {children}
    </LinearGradient>
  );
}

/** Variante sem degradê, para quando o Panel precisa envolver conteúdo grande. */
export function FlatPanel({ children, style, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.panel, styles.flat, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.panel,
  },
  flat: {
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.primary,
  },
});
