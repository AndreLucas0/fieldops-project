import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, radii, shadows, spacing } from '../tokens';

export type PanelProps = {
  children: ReactNode;
  /** `flat` para itens de lista; `raised` para o cartão principal da tela. */
  tone?: 'flat' | 'raised';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Panel({ children, tone = 'flat', style, testID }: PanelProps) {
  if (tone === 'raised') {
    return (
      <LinearGradient
        testID={testID}
        colors={[...gradients.steel]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.base, styles.raised, style]}>
        {children}
      </LinearGradient>
    );
  }

  return (
    <View testID={testID} style={[styles.base, styles.flat, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  flat: {
    backgroundColor: colors.surface,
  },
  raised: {
    ...shadows.panel,
    borderRadius: radii['2xl'],
    padding: spacing['2xl'],
  },
});
