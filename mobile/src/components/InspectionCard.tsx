import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Badge,
  colors,
  Panel,
  spacing,
  Text,
} from '@/design-system';
import {
  summarize,
  SYNC_STATUS_LABEL,
  type Inspection,
  type SyncStatus,
} from '@/domain/inspection';

/**
 * Cartão de inspeção usado no início e no histórico.
 *
 * Além do que o protótipo mostrava, exibe o estado de sincronização: o RNF-004
 * e a §13.8 exigem que "aguardando envio" e "falha" fiquem visíveis na lista,
 * e não apenas em uma mensagem passageira.
 */

export function InspectionCard({
  inspection,
  variant = 'progress',
}: {
  inspection: Inspection;
  /** `progress` mostra o preenchimento; `result` mostra o índice final. */
  variant?: 'progress' | 'result';
}) {
  const summary = summarize(inspection.itemsSnapshot, inspection.answers);
  const identification =
    [inspection.equipment, inspection.site].filter(Boolean).join(' • ') || 'Sem identificação';

  return (
    <Link href={`/inspecoes/${inspection.id}`} asChild>
      <Pressable accessibilityRole="button">
        {({ pressed }) => (
          <Panel style={[styles.card, pressed && styles.pressed]}>
            <View style={styles.main}>
              <Text variant="bodySemibold" numberOfLines={1}>
                {inspection.templateTitle}
              </Text>
              <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                {identification}
              </Text>

              {variant === 'progress' ? (
                <Text variant="caption" color="primary">
                  {summary.answered}/{summary.total} itens preenchidos
                </Text>
              ) : (
                <Text variant="caption" color="mutedForeground">
                  {formatDateTime(inspection.completedAtDevice ?? inspection.createdAt)}
                </Text>
              )}

              <View style={styles.badges}>
                <SyncBadge status={inspection.syncStatus} />
                {summary.nonConforming > 0 && (
                  <Badge label={`${summary.nonConforming} não conf.`} tone="destructive" />
                )}
              </View>
            </View>

            {variant === 'result' && (
              <View style={styles.score}>
                <Text
                  variant="title"
                  color={summary.nonConforming > 0 ? 'destructive' : 'primary'}
                >
                  {summary.score}%
                </Text>
                <Text variant="captionMedium" color="mutedForeground">
                  conforme
                </Text>
              </View>
            )}

            <ChevronRight size={20} color={colors.mutedForeground} />
          </Panel>
        )}
      </Pressable>
    </Link>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const tone = {
    SYNCED: 'success',
    PENDING: 'warning',
    ERROR: 'destructive',
    CONFLICT: 'destructive',
  } as const;

  return <Badge label={SYNC_STATUS_LABEL[status]} tone={tone[status]} />;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  main: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  score: {
    alignItems: 'flex-end',
  },
});
