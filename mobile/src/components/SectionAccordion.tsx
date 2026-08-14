import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, radii, spacing, Text, touchTarget } from '@/design-system';

import { ProgressBar } from './ProgressBar';

export type SectionAccordionProps = {
  title: string;
  itemCount: number;
  answeredCount: number;
  children: ReactNode;
  /** Estado inicial quando a seção controla a si mesma. Padrão: aberta. */
  defaultExpanded?: boolean;
  /**
   * Torna a seção controlada — necessário quando algo de fora precisa abri-la
   * (por exemplo, o "ir para pendências" do checklist).
   */
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  subtitle?: string | null;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Seção colapsável do checklist (FE-M08).
 *
 * O cabeçalho mostra o progresso da seção mesmo fechado: é o que permite ao
 * técnico achar rapidamente onde ainda falta responder.
 */
export function SectionAccordion({
  title,
  itemCount,
  answeredCount,
  children,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle,
  subtitle,
  style,
  testID,
}: SectionAccordionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  const controlled = controlledExpanded !== undefined;
  const expanded = controlled ? controlledExpanded : internalExpanded;
  const complete = itemCount > 0 && answeredCount >= itemCount;

  function toggle(): void {
    const next = !expanded;
    if (!controlled) setInternalExpanded(next);
    onToggle?.(next);
  }

  return (
    <View testID={testID} style={[styles.root, style]}>
      <Pressable
        testID={testID ? `${testID}-toggle` : undefined}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={title}
        accessibilityHint={`${answeredCount} de ${itemCount} respondidos. Toque para ${
          expanded ? 'recolher' : 'expandir'
        }.`}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text variant="subtitle" numberOfLines={2} style={styles.title}>
              {title}
            </Text>

            <Text
              testID={testID ? `${testID}-count` : undefined}
              variant="caption"
              tone={complete ? 'success' : 'muted'}>
              {answeredCount}/{itemCount}
            </Text>
          </View>

          {subtitle ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}

          <ProgressBar answered={answeredCount} total={itemCount} showLabel={false} />
        </View>

        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.chevron}>
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>

      {expanded ? (
        <View testID={testID ? `${testID}-content` : undefined} style={styles.content}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget,
    padding: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.surface2,
  },
  headerText: {
    flex: 1,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  chevron: {
    color: colors.mutedForeground,
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
