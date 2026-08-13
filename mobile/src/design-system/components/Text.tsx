import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fonts, fontSizes } from '../tokens';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption';
type Tone = 'default' | 'muted' | 'primary' | 'danger' | 'success';

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
};

export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  return <RNText {...rest} style={[styles[variant], toneStyles[tone], style]} />;
}

const styles = StyleSheet.create({
  display: {
    fontFamily: fonts.displayExtra,
    fontSize: fontSizes['4xl'],
    lineHeight: fontSizes['4xl'] * 1.15,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSizes['2xl'],
    lineHeight: fontSizes['2xl'] * 1.2,
  },
  subtitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * 1.4,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * 1.5,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
  },
});

const toneStyles = StyleSheet.create({
  default: { color: colors.foreground },
  muted: { color: colors.mutedForeground },
  primary: { color: colors.primary },
  danger: { color: colors.destructive },
  success: { color: colors.success },
});
