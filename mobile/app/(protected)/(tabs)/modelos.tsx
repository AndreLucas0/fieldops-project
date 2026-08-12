import { Link, useRouter } from 'expo-router';
import { ChevronRight, ListChecks, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  colors,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  Screen,
  spacing,
  Text,
  textColor,
} from '@/design-system';
import { useTemplates } from '@/hooks/use-inspection-data';

/** Lista de modelos — porte de `_authenticated/modelos.index.tsx`. */
export default function TemplatesScreen() {
  const router = useRouter();
  const { data: templates = [], isLoading, error } = useTemplates();

  return (
    <Screen
      title="Modelos"
      subtitle="Checklists reutilizáveis"
      action={
        <Button
          title="Novo"
          size="sm"
          icon={<Plus size={16} color={textColor.primary} />}
          onPress={() => router.push('/modelos/novo')}
        />
      }
    >
      {error ? (
        <ErrorState message="Não foi possível carregar os modelos." />
      ) : isLoading ? (
        <LoadingState />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={32} color={colors.primary} />}
          title="Nenhum modelo ainda"
          description="Modelos definem os itens verificados em cada inspeção."
          action={
            <Button
              title="Criar modelo"
              style={styles.emptyAction}
              onPress={() => router.push('/modelos/novo')}
            />
          }
        />
      ) : (
        <View style={styles.list}>
          {templates.map((template) => (
            <Link key={template.id} href={`/modelos/${template.id}`} asChild>
              <Pressable accessibilityRole="button">
                {({ pressed }) => (
                  <Panel style={[styles.card, pressed && styles.pressed]}>
                    <View style={styles.info}>
                      <Text variant="bodySemibold" numberOfLines={1}>
                        {template.title}
                      </Text>
                      {template.category && <Badge label={template.category} tone="primary" />}
                      <Text variant="caption" color="mutedForeground">
                        {template.items.length} itens
                      </Text>
                    </View>
                    <ChevronRight size={20} color={colors.mutedForeground} />
                  </Panel>
                )}
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  info: {
    flex: 1,
    gap: spacing.xs + 2,
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.85,
  },
  emptyAction: {
    alignSelf: 'stretch',
  },
});
