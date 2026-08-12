import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Play, Trash2 } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  colors,
  ErrorState,
  LoadingState,
  Panel,
  Screen,
  spacing,
  Text,
  textColor,
} from '@/design-system';
import { RESPONSE_TYPE_LABEL } from '@/domain/inspection';
import { useDeleteTemplate, useTemplate } from '@/hooks/use-inspection-data';

/** Detalhe do modelo — porte de `_authenticated/modelos.$id.tsx`. */
export default function TemplateDetailScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const router = useRouter();
  const { data: template, isLoading, error } = useTemplate(templateId);
  const remove = useDeleteTemplate();

  function confirmDelete() {
    Alert.alert(
      'Excluir modelo',
      'As inspeções já realizadas continuam no histórico, com os itens preservados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () =>
            remove.mutate(templateId, {
              onSuccess: () => router.replace('/modelos'),
              onError: () => Alert.alert('Erro', 'Não foi possível excluir o modelo.'),
            }),
        },
      ],
    );
  }

  return (
    <Screen
      title={template?.title ?? 'Modelo'}
      subtitle={template?.category ?? 'Checklist'}
      showBack
    >
      {error ? (
        <ErrorState message="Não foi possível carregar o modelo." />
      ) : isLoading ? (
        <LoadingState />
      ) : !template ? (
        <ErrorState message="Modelo não encontrado." />
      ) : (
        <>
          {template.description && (
            <Panel style={styles.description}>
              <Text variant="body" color="mutedForeground">
                {template.description}
              </Text>
            </Panel>
          )}

          <View style={styles.section}>
            <Text variant="sectionLabel" color="mutedForeground">
              Itens ({template.items.length})
            </Text>

            <View style={styles.list}>
              {template.items.map((item, index) => (
                <Panel key={item.id} style={styles.item}>
                  <View style={styles.itemIndex}>
                    <Text variant="captionMedium" color="primary">
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.itemBody}>
                    <Text variant="bodyMedium">{item.title}</Text>
                    {item.description && (
                      <Text variant="caption" color="mutedForeground">
                        {item.description}
                      </Text>
                    )}
                    <View style={styles.itemBadges}>
                      <Badge label={RESPONSE_TYPE_LABEL[item.responseType]} />
                      {item.required && <Badge label="Obrigatório" tone="primary" />}
                      {item.evidenceRequiredOnFailure && (
                        <Badge label="Foto se não conforme" tone="warning" />
                      )}
                    </View>
                  </View>
                </Panel>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Iniciar inspeção"
              size="lg"
              icon={<Play size={20} color={textColor.primary} />}
              onPress={() => router.push(`/inspecoes/nova?templateId=${template.id}`)}
            />
            <Button
              title="Excluir modelo"
              variant="ghost"
              loading={remove.isPending}
              icon={<Trash2 size={16} color={colors.destructive} />}
              onPress={confirmDelete}
            />
            <View style={styles.note}>
              <CheckCircle2 size={14} color={colors.mutedForeground} />
              <Text variant="caption" color="mutedForeground">
                As inspeções já feitas continuam no histórico.
              </Text>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: {
    padding: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  itemIndex: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(243, 165, 27, 0.15)',
  },
  itemBody: {
    flex: 1,
    gap: spacing.xs + 2,
  },
  itemBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  actions: {
    gap: spacing.md,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
