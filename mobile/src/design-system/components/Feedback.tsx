import { StyleSheet, View } from 'react-native';

import { alpha, colors, radii, spacing } from '../tokens';
import { Text } from './Text';

type Tone = 'error' | 'warning' | 'success' | 'info';

export type FeedbackProps = {
  tone: Tone;
  message: string;
  testID?: string;
};

/**
 * Aviso persistente ligado a uma ação. Os docs (§13.8) proíbem comunicar
 * estado apenas por cor, então cada tom traz também um rótulo textual.
 */
export function Feedback({ tone, message, testID }: FeedbackProps) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.root, toneStyles[tone]]}>
      <Text variant="caption" style={[styles.tag, tagStyles[tone]]}>
        {LABELS[tone]}
      </Text>
      <Text variant="caption" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const LABELS: Record<Tone, string> = {
  error: 'ERRO',
  warning: 'ATENÇÃO',
  success: 'OK',
  info: 'INFO',
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tag: {
    letterSpacing: 0.6,
  },
  message: {
    flex: 1,
    color: colors.foreground,
  },
});

const toneStyles = StyleSheet.create({
  error: { backgroundColor: alpha.destructive15, borderColor: colors.destructive },
  warning: { backgroundColor: alpha.warning15, borderColor: colors.warning },
  success: { backgroundColor: alpha.success15, borderColor: colors.success },
  info: { backgroundColor: colors.muted, borderColor: colors.border },
});

const tagStyles = StyleSheet.create({
  error: { color: colors.destructive },
  warning: { color: colors.warning },
  success: { color: colors.success },
  info: { color: colors.mutedForeground },
});
