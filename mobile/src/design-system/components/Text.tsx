import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { colors, fonts, fontSizes } from '../tokens';

/**
 * Texto com a tipografia do produto já aplicada.
 *
 * As variantes `title`/`heading` usam Archivo (`--font-display`), como no
 * protótipo, onde h1/h2/h3 recebiam a fonte de display; o restante usa Barlow.
 */

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'sectionLabel'
  | 'body'
  | 'bodyMedium'
  | 'bodySemibold'
  | 'caption'
  | 'captionMedium';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: keyof typeof colors;
  center?: boolean;
}

export function Text({
  variant = 'body',
  color = 'foreground',
  center,
  style,
  ...rest
}: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[styles[variant], { color: colors[color] }, center && styles.center, style]}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: fonts.displayExtra,
    fontSize: fontSizes['4xl'],
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: fonts.displayExtra,
    fontSize: fontSizes.xl,
    letterSpacing: -0.2,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    letterSpacing: -0.2,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
  bodyMedium: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
  },
  bodySemibold: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.base,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
  },
  captionMedium: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.xxs,
  },
  center: {
    textAlign: 'center',
  },
});
