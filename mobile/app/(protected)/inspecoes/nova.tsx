import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  Screen,
  spacing,
  Text,
  textColor,
} from '@/design-system';
import { useCreateInspection, useTemplates } from '@/hooks/use-inspection-data';

/** Nova inspeção — porte de `_authenticated/inspecoes.nova.tsx`. */
export default function NewInspectionScreen() {
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const { data: templates = [], isLoading, error } = useTemplates();
  const createInspection = useCreateInspection();

  const [selected, setSelected] = useState<string | null>(templateId ?? null);
  const [equipment, setEquipment] = useState('');
  const [site, setSite] = useState('');

  function handleStart() {
    if (!selected) return;
    createInspection.mutate(
      {
        templateId: selected,
        equipment: equipment.trim() || null,
        site: site.trim() || null,
      },
      {
        onSuccess: (inspection) => router.replace(`/inspecoes/${inspection.id}`),
        onError: () => Alert.alert('Erro', 'Não foi possível iniciar a inspeção.'),
      },
    );
  }

  return (
    <Screen title="Nova inspeção" subtitle="Escolha o modelo e identifique o ativo" showBack>
      <View style={styles.form}>
        <Field
          label="Ativo / equipamento"
          value={equipment}
          onChangeText={setEquipment}
          placeholder="Ex.: Compressor 03"
          maxLength={120}
        />
        <Field
          label="Local"
          value={site}
          onChangeText={setSite}
          placeholder="Ex.: Galpão B — Linha 2"
          maxLength={120}
        />
      </View>

      <View style={styles.section}>
        <Text variant="sectionLabel" color="mutedForeground">
          Modelo
        </Text>

        {error ? (
          <ErrorState message="Não foi possível carregar os modelos." />
        ) : isLoading ? (
          <LoadingState />
        ) : templates.length === 0 ? (
          <Panel style={styles.emptyCard}>
            <Text variant="body" color="mutedForeground">
              Você ainda não tem modelos.
            </Text>
            <Button
              title="Criar modelo"
              variant="outline"
              onPress={() => router.push('/modelos/novo')}
            />
          </Panel>
        ) : (
          <View style={styles.list}>
            {templates.map((template) => {
              const isSelected = selected === template.id;
              return (
                <Pressable
                  key={template.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(template.id)}
                >
                  {({ pressed }) => (
                    <Panel
                      selected={isSelected}
                      style={[styles.templateCard, pressed && styles.pressed]}
                    >
                      <Text variant="bodySemibold" numberOfLines={1}>
                        {template.title}
                      </Text>
                      <Text variant="caption" color="mutedForeground">
                        {template.items.length} itens
                        {template.category ? ` • ${template.category}` : ''}
                      </Text>
                    </Panel>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <Button
        title="Iniciar inspeção"
        size="lg"
        icon={<Play size={20} color={textColor.primary} />}
        disabled={!selected}
        loading={createInspection.isPending}
        onPress={handleStart}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  templateCard: {
    padding: spacing.lg,
    gap: 2,
  },
  emptyCard: {
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.85,
  },
});
