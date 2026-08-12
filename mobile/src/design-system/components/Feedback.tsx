import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { alpha, colors, fonts, fontSizes, radii, spacing } from '../tokens';
import { Panel } from './Panel';
import { Text } from './Text';

/**
 * Estados de carregamento, vazio e erro — obrigatórios em toda listagem
 * conforme RNF-004 (docs/arquitetura.md §11.14).
 */

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text variant="body" color="mutedForeground">
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel style={styles.empty}>
      {icon}
      <Text variant="bodySemibold" center>
        {title}
      </Text>
      {description && (
        <Text variant="body" color="mutedForeground" center>
          {description}
        </Text>
      )}
      {action}
    </Panel>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Panel style={styles.error}>
      <Text variant="bodySemibold" color="destructive" center>
        Algo deu errado
      </Text>
      <Text variant="body" color="mutedForeground" center>
        {message}
      </Text>
    </Panel>
  );
}

/** Etiqueta compacta de estado, usada nos cartões de inspeção. */
export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'destructive' | 'warning';
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.badge, badgeTone[tone].container, style]}>
      <Text style={[styles.badgeLabel, badgeTone[tone].label]}>{label}</Text>
    </View>
  );
}

const badgeTone = {
  neutral: {
    container: { backgroundColor: colors.muted },
    label: { color: colors.mutedForeground },
  },
  primary: {
    container: { backgroundColor: alpha.primary15 },
    label: { color: colors.primary },
  },
  success: {
    container: { backgroundColor: alpha.successs15 },
    label: { color: colors.success },
  },
  destructive: {
    container: { backgroundColor: alpha.destructive15 },
    label: { color: colors.destructive },
  },
  warning: {
    container: { backgroundColor: alpha.primary15 },
    label: { color: colors.warning },
  },
} as const;

/** Barra de progresso do checklist. */
export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing['3xl'],
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing['2xl'],
  },
  error: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  badgeLabel: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xxs,
  },
  track: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
});
