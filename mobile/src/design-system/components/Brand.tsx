import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, fontSizes, spacing } from '../tokens';
import { Text } from './Text';

export type BrandProps = {
  size?: 'sm' | 'lg';
  testID?: string;
};

/** Capacete de segurança — mesma marca do protótipo, desenhada em SVG. */
function HardHat({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15a8 8 0 0 1 16 0"
        stroke={colors.primary}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M9.5 8.2V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8v3.4"
        stroke={colors.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.5 15h19a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-19a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1Z"
        stroke={colors.primary}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Brand({ size = 'sm', testID }: BrandProps) {
  const iconSize = size === 'lg' ? 32 : 22;

  return (
    <View testID={testID} accessibilityRole="header" style={styles.root}>
      <HardHat size={iconSize} />
      <Text style={[styles.word, size === 'lg' && styles.wordLarge]}>FieldOps</Text>
    </View>
  );
}

/** Marcação diagonal âmbar usada no topo da apresentação. */
export function BrandSlashes({ testID }: { testID?: string }) {
  return (
    <View testID={testID} style={styles.slashes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={[styles.slash, { opacity: 1 - index * 0.22 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  word: {
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    letterSpacing: 0.2,
  },
  wordLarge: {
    fontSize: fontSizes['2xl'],
  },
  slashes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  slash: {
    width: 18,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.primary,
    transform: [{ skewX: '-22deg' }],
  },
});
