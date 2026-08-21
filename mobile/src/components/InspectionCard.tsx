import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing, Text, touchTarget } from '@/design-system';
import type { Inspection } from '@/models';

import { formatScheduledFor, isOverdue } from './relative-date';
import { StatusBadge } from './StatusBadge';

export type InspectionCardProps = {
  inspection: Inspection;
  /**
   * Nome do cliente e do local. O contrato de `GET /mobile/inspections`
   * devolve só `clientId`/`siteId` (`openapi.yaml` §Inspection), então a tela
   * resolve os nomes e passa aqui; sem eles a linha some em vez de exibir UUID.
   */
  clientName?: string | null;
  siteName?: string | null;
  equipmentName?: string | null;
  onPress?: (inspection: Inspection) => void;
  style?: ViewStyle;
  testID?: string;
};

/** Estados em que ainda se espera trabalho do técnico. */
const OPEN_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'];

/**
 * Cartão da lista de inspeções (FE-M03).
 *
 * Mostra o que decide a próxima ação do técnico: o que é, onde, quando, em que
 * estado e com que urgência.
 */
export function InspectionCard({
  inspection,
  clientName,
  siteName,
  equipmentName,
  onPress,
  style,
  testID,
}: InspectionCardProps) {
  const title = inspectionTitle(inspection);
  const place = [clientName, siteName].filter(Boolean).join(' • ');
  const scheduled = formatScheduledFor(inspection.scheduledFor);

  // Atrasada só faz sentido enquanto há o que fazer: uma inspeção aprovada não
  // fica "vencida" para sempre.
  const overdue = OPEN_STATUSES.includes(inspection.status) && isOverdue(inspection.scheduledFor);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${scheduled}.`}
      accessibilityHint="Abre os detalhes da inspeção"
      disabled={!onPress}
      onPress={() => onPress?.(inspection)}
      style={({ pressed }) => [styles.root, pressed && onPress ? styles.pressed : null, style]}>
      <View style={styles.header}>
        <Text variant="subtitle" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        <StatusBadge value={inspection.priority} context="priority" size="sm" />
      </View>

      {place ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {place}
        </Text>
      ) : null}

      {equipmentName ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {equipmentName}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <StatusBadge value={inspection.status} context="inspection" />

        <View style={styles.schedule}>
          {overdue ? (
            <Text variant="caption" tone="danger" style={styles.overdue}>
              ATRASADA
            </Text>
          ) : null}
          <Text variant="caption" tone={overdue ? 'danger' : 'muted'}>
            {scheduled}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * `title` é opcional no contrato. Sem ele, o identificador curto ainda permite
 * ao técnico distinguir duas inspeções na lista.
 */
export function inspectionTitle(inspection: Inspection): string {
  const title = inspection.title?.trim();
  if (title) return title;

  // UUID inteiro não cabe e não ajuda; os primeiros caracteres bastam.
  return `Inspeção #${inspection.id.slice(0, 8)}`;
}

const styles = StyleSheet.create({
  root: {
    minHeight: touchTarget,
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.surface2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  schedule: {
    alignItems: 'flex-end',
  },
  overdue: {
    letterSpacing: 0.6,
  },
});
