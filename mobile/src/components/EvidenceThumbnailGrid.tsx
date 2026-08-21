import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing, Text, touchTarget } from '@/design-system';
import type { Evidence } from '@/models';

import { formatDateTime, parseIsoDate } from './relative-date';

export type EvidenceThumbnailGridProps = {
  evidences: readonly Evidence[];
  /** Número de colunas da grade. Padrão: 3. */
  columns?: number;
  /** Ação de remoção; sem ela, a visualização é somente leitura. */
  onRemove?: (evidence: Evidence) => void;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Grade de miniaturas das evidências da inspeção (FE-M13).
 *
 * A imagem vem de `accessUrl`, a URL temporária que a API devolve (§11.8).
 * Evidência sem URL ainda aparece na grade, como espaço reservado, para o
 * técnico saber que a foto existe.
 */
export function EvidenceThumbnailGrid({
  evidences,
  columns = 3,
  onRemove,
  style,
  testID,
}: EvidenceThumbnailGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const opened = openIndex != null ? evidences[openIndex] : undefined;
  const capturedAt = parseIsoDate(opened?.capturedAtDevice);

  if (evidences.length === 0) {
    return (
      <Text testID={testID ? `${testID}-empty` : undefined} variant="caption" tone="muted">
        Nenhuma evidência registrada.
      </Text>
    );
  }

  return (
    <View testID={testID} style={[styles.grid, style]}>
      {evidences.map((evidence, index) => (
        <Pressable
          key={evidence.id}
          testID={testID ? `${testID}-item-${index}` : undefined}
          accessibilityRole="imagebutton"
          accessibilityLabel={evidence.description ?? `Evidência ${index + 1}`}
          accessibilityHint="Abre a foto em tela cheia"
          onPress={() => setOpenIndex(index)}
          style={[styles.thumb, { width: `${100 / columns}%` }]}>
          {evidence.accessUrl ? (
            <Image
              source={{ uri: evidence.accessUrl }}
              resizeMode="cover"
              style={styles.thumbImage}
            />
          ) : (
            <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
              <Text variant="caption" tone="muted">
                sem prévia
              </Text>
            </View>
          )}
        </Pressable>
      ))}

      <Modal
        visible={opened !== undefined}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpenIndex(null)}>
        <View style={styles.viewer}>
          {opened?.accessUrl ? (
            <Image
              testID={testID ? `${testID}-full` : undefined}
              source={{ uri: opened.accessUrl }}
              resizeMode="contain"
              style={styles.viewerImage}
            />
          ) : (
            <Text tone="muted">Prévia indisponível.</Text>
          )}

          <View style={styles.viewerBar}>
            <View style={styles.viewerInfo}>
              <Text variant="label">
                {openIndex != null ? `${openIndex + 1} de ${evidences.length}` : ''}
              </Text>
              {capturedAt ? (
                <Text variant="caption" tone="muted">
                  Capturada em {formatDateTime(capturedAt)}
                </Text>
              ) : null}
              {opened?.description ? (
                <Text variant="caption" tone="muted">
                  {opened.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.viewerActions}>
              {onRemove && opened ? (
                <Pressable
                  testID={testID ? `${testID}-remove` : undefined}
                  accessibilityRole="button"
                  accessibilityLabel="Remover evidência"
                  onPress={() => {
                    onRemove(opened);
                    setOpenIndex(null);
                  }}
                  style={styles.viewerButton}>
                  <Text variant="label" tone="danger">
                    REMOVER
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                testID={testID ? `${testID}-close` : undefined}
                accessibilityRole="button"
                accessibilityLabel="Fechar visualização"
                onPress={() => setOpenIndex(null)}
                style={styles.viewerButton}>
                <Text variant="label">FECHAR</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -spacing.xs,
  },
  thumb: {
    padding: spacing.xs,
  },
  thumbImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  viewerImage: {
    flex: 1,
    width: '100%',
  },
  viewerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  viewerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  viewerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  viewerButton: {
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
