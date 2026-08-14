import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, fontSizes, radii, spacing, Text } from '@/design-system';

import { describeStatus, type BadgeContext, type BadgeTone } from './status-catalog';

export type StatusBadgeProps = {
  /** Valor cru do enum, como veio da API. */
  value: string | null | undefined;
  /** Conjunto ao qual o valor pertence — decide o dicionário de tradução. */
  context: BadgeContext;
  /** `sm` para dentro de cartões e listas densas. */
  size?: 'sm' | 'md';
  style?: ViewStyle;
  testID?: string;
};

/**
 * Etiqueta de estado.
 *
 * O rótulo é sempre texto, nunca só cor: `docs/aplicativo-mobile.md` §13.9
 * proíbe comunicar estado exclusivamente por cor.
 */
export function StatusBadge({ value, context, size = 'md', style, testID }: StatusBadgeProps) {
  const { label, tone } = describeStatus(context, value);
  const palette = tonePalette[tone];

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      style={[
        styles.root,
        size === 'sm' && styles.small,
        { backgroundColor: palette.background, borderColor: palette.border },
        style,
      ]}>
      <Text
        variant="label"
        numberOfLines={1}
        style={[styles.label, size === 'sm' && styles.labelSmall, { color: palette.foreground }]}>
        {label}
      </Text>
    </View>
  );
}

type TonePalette = { background: string; foreground: string; border: string };

/**
 * Tons calibrados para o fundo escuro do app: fundo translúcido e texto
 * saturado. As cores claras da interface web ficariam ilegíveis aqui.
 */
const tonePalette: Record<BadgeTone, TonePalette> = {
  gray: {
    background: 'rgba(152, 159, 167, 0.14)',
    foreground: '#b9c0c7',
    border: 'rgba(152, 159, 167, 0.32)',
  },
  grayDark: {
    background: 'rgba(255, 255, 255, 0.05)',
    foreground: '#828a92',
    border: 'rgba(255, 255, 255, 0.12)',
  },
  blue: {
    background: 'rgba(0, 165, 195, 0.16)',
    foreground: '#4cc7dd',
    border: 'rgba(0, 165, 195, 0.38)',
  },
  yellow: {
    background: 'rgba(234, 181, 50, 0.16)',
    foreground: '#f0c65c',
    border: 'rgba(234, 181, 50, 0.38)',
  },
  orange: {
    background: 'rgba(243, 138, 27, 0.16)',
    foreground: '#f7a94e',
    border: 'rgba(243, 138, 27, 0.38)',
  },
  indigo: {
    background: 'rgba(115, 128, 236, 0.18)',
    foreground: '#9aa4f2',
    border: 'rgba(115, 128, 236, 0.4)',
  },
  purple: {
    background: 'rgba(163, 116, 236, 0.18)',
    foreground: '#bb96f2',
    border: 'rgba(163, 116, 236, 0.4)',
  },
  green: {
    background: 'rgba(59, 185, 116, 0.16)',
    foreground: '#5ecb8e',
    border: 'rgba(59, 185, 116, 0.38)',
  },
  red: {
    background: 'rgba(234, 59, 72, 0.16)',
    foreground: '#f4707a',
    border: 'rgba(234, 59, 72, 0.4)',
  },
  redDark: {
    background: 'rgba(154, 30, 40, 0.42)',
    foreground: '#f2a3a9',
    border: 'rgba(234, 59, 72, 0.5)',
  },
};

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: radii.full,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.muted,
  },
  small: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  label: {
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.3,
  },
  labelSmall: {
    fontSize: fontSizes.xxs,
    lineHeight: fontSizes.xxs * 1.3,
  },
});
