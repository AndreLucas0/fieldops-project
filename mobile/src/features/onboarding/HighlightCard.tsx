import { StyleSheet, View } from 'react-native';

import { alpha, Icon, Panel, radii, spacing, Text } from '@/design-system';
import type { Highlight } from './highlights';

export function HighlightCard({ highlight }: { highlight: Highlight }) {
  return (
    <Panel testID={`highlight-${highlight.id}`} style={styles.panel}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Icon name={highlight.icon} size={20} />
        </View>
        <View style={styles.texts}>
          <Text variant="subtitle">{highlight.title}</Text>
          <Text variant="caption" tone="muted">
            {highlight.description}
          </Text>
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: alpha.primary15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
