import { useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Checkbox,
  ChipGroup,
  colors,
  Field,
  Panel,
  Screen,
  spacing,
  Text,
  type ChipOption,
} from '@/design-system';
import {
  RESPONSE_TYPE_LABEL,
  RESPONSE_TYPES,
  type ResponseType,
  type TemplateItem,
} from '@/domain/inspection';
import { newId } from '@/infrastructure/ids';
import { useCreateTemplate } from '@/hooks/use-inspection-data';

/**
 * Construtor de modelo — porte de `_authenticated/modelos.novo.tsx`.
 *
 * O protótipo só tinha rótulo + "exigir foto". Aqui cada item também escolhe
 * o tipo de resposta e a obrigatoriedade, porque é isso que o checklist
 * dinâmico precisa renderizar depois (docs §13.5, RN-016).
 */

/** Item ainda em edição — o id é local até o modelo ser salvo. */
type DraftItem = Omit<TemplateItem, 'displayOrder'> & { key: string };

const responseTypeOptions: ChipOption<ResponseType>[] = RESPONSE_TYPES.map((type) => ({
  value: type,
  label: RESPONSE_TYPE_LABEL[type],
}));

function emptyItem(): DraftItem {
  return {
    key: newId(),
    id: newId(),
    title: '',
    responseType: 'CONFORMITY',
    required: true,
    observationRequiredOnFailure: false,
    evidenceRequiredOnFailure: false,
  };
}

export default function NewTemplateScreen() {
  const router = useRouter();
  const createTemplate = useCreateTemplate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function handleSave() {
    const cleaned = items
      .map((item) => ({ ...item, title: item.title.trim() }))
      .filter((item) => item.title.length > 0);

    // RN-015 — título e ao menos um item válido antes de salvar.
    if (!title.trim()) {
      setError('Informe o nome do modelo');
      return;
    }
    if (cleaned.length === 0) {
      setError('Adicione ao menos um item com título');
      return;
    }
    setError(null);

    createTemplate.mutate(
      {
        title: title.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        items: cleaned.map((item, index) => ({
          title: item.title,
          description: item.description ?? null,
          responseType: item.responseType,
          required: item.required,
          observationRequiredOnFailure: item.observationRequiredOnFailure,
          evidenceRequiredOnFailure: item.evidenceRequiredOnFailure,
          options: item.options,
          // RN-017 — a ordem é explícita, derivada da posição na tela.
          displayOrder: index + 1,
        })),
      },
      {
        onSuccess: (template) => router.replace(`/modelos/${template.id}`),
        onError: () => Alert.alert('Erro', 'Não foi possível salvar o modelo.'),
      },
    );
  }

  return (
    <Screen title="Novo modelo" subtitle="Defina os itens do checklist" showBack>
      <View style={styles.form}>
        <Field
          label="Nome do modelo"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Inspeção de prensa hidráulica"
          maxLength={120}
        />
        <Field
          label="Categoria / área"
          value={category}
          onChangeText={setCategory}
          placeholder="Ex.: Manutenção, Segurança"
          maxLength={60}
        />
        <Field
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          placeholder="Quando e como usar este checklist"
          multiline
          maxLength={500}
        />
      </View>

      <View style={styles.section}>
        <Text variant="sectionLabel" color="mutedForeground">
          Itens ({items.length})
        </Text>

        <View style={styles.list}>
          {items.map((item, index) => (
            <Panel key={item.key} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text variant="captionMedium" color="mutedForeground">
                  ITEM {index + 1}
                </Text>
                {items.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover item ${index + 1}`}
                    onPress={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                  >
                    <Trash2 size={16} color={colors.destructive} />
                  </Pressable>
                )}
              </View>

              <Field
                value={item.title}
                onChangeText={(text) => updateItem(item.key, { title: text })}
                placeholder={`Pergunta ou verificação ${index + 1}`}
                maxLength={160}
              />

              <View style={styles.itemField}>
                <Text variant="caption" color="mutedForeground">
                  Tipo de resposta
                </Text>
                <ChipGroup
                  options={responseTypeOptions}
                  value={item.responseType}
                  onChange={(type) => updateItem(item.key, { responseType: type })}
                />
              </View>

              {item.responseType === 'SINGLE_CHOICE' && (
                <Field
                  label="Alternativas"
                  value={item.options?.join(', ') ?? ''}
                  onChangeText={(text) =>
                    updateItem(item.key, {
                      options: text
                        .split(',')
                        .map((option) => option.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Separe por vírgula: Alta, Média, Baixa"
                  hint="As alternativas aparecem como botões no checklist."
                />
              )}

              <View style={styles.rules}>
                <Checkbox
                  label="Item obrigatório"
                  checked={item.required}
                  onChange={(checked) => updateItem(item.key, { required: checked })}
                />
                {item.responseType === 'CONFORMITY' && (
                  <>
                    <Checkbox
                      label="Exigir observação quando não conforme"
                      checked={!!item.observationRequiredOnFailure}
                      onChange={(checked) =>
                        updateItem(item.key, { observationRequiredOnFailure: checked })
                      }
                    />
                    <Checkbox
                      label="Exigir foto quando não conforme"
                      checked={!!item.evidenceRequiredOnFailure}
                      onChange={(checked) =>
                        updateItem(item.key, { evidenceRequiredOnFailure: checked })
                      }
                    />
                  </>
                )}
              </View>
            </Panel>
          ))}
        </View>

        <Button
          title="Adicionar item"
          variant="outline"
          icon={<Plus size={16} color={colors.foreground} />}
          onPress={() => setItems((prev) => [...prev, emptyItem()])}
        />
      </View>

      {error && (
        <Text variant="body" color="destructive" center>
          {error}
        </Text>
      )}

      <Button
        title="Salvar modelo"
        size="lg"
        loading={createTemplate.isPending}
        onPress={handleSave}
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
  itemCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemField: {
    gap: spacing.sm,
  },
  rules: {
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
