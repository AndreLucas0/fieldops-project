import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing, Text } from '@/design-system';

export type ProgressBarProps = {
  answered: number;
  total: number;
  /** Oculta o texto quando o rótulo já aparece ao lado (ex.: no acordeão). */
  showLabel?: boolean;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Progresso do checklist.
 *
 * O número vem sempre escrito junto da barra: §13.9 proíbe comunicar estado só
 * por cor, e "7 de 12" é mais acionável que uma barra parcialmente cheia.
 */
export function ProgressBar({
  answered,
  total,
  showLabel = true,
  style,
  testID,
}: ProgressBarProps) {
  const { ratio, color } = progressState(answered, total);
  const label = `${clampAnswered(answered, total)} de ${Math.max(0, total)} respondidos`;

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: Math.max(0, total), now: clampAnswered(answered, total) }}
      accessibilityLabel={label}
      style={[styles.root, style]}>
      <View style={styles.track}>
        <View
          testID={testID ? `${testID}-fill` : undefined}
          style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]}
        />
      </View>

      {showLabel ? (
        <Text testID={testID ? `${testID}-label` : undefined} variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Verde só no checklist inteiro respondido, amarelo em andamento, cinza no
 * começo. `total` zero é tratado como vazio, não como concluído.
 */
export function progressState(answered: number, total: number): { ratio: number; color: string } {
  if (total <= 0) return { ratio: 0, color: colors.muted };

  const done = clampAnswered(answered, total);
  const ratio = done / total;

  if (done === 0) return { ratio: 0, color: colors.muted };
  if (done >= total) return { ratio: 1, color: colors.success };
  return { ratio, color: colors.warning };
}

function clampAnswered(answered: number, total: number): number {
  return Math.max(0, Math.min(answered, Math.max(0, total)));
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
