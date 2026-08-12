import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Minus, TriangleAlert, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import {
  Badge,
  ChipGroup,
  colors,
  Field,
  Panel,
  radii,
  spacing,
  Text,
  type ChipOption,
} from '@/design-system';
import {
  isSupportedResponseType,
  type Answer,
  type Conformity,
  type TemplateItem,
} from '@/domain/inspection';

/**
 * Renderizador dinâmico de um item do checklist.
 *
 * O mapeamento tipo → componente é o de docs/aplicativo-mobile.md §13.5. Um
 * tipo desconhecido não derruba a tela: o item é exibido com um aviso de
 * incompatibilidade, como a mesma seção exige.
 */

const conformityOptions: ChipOption<Conformity>[] = [
  {
    value: 'CONFORMING',
    label: 'Conforme',
    icon: <Check size={14} color={colors.primaryForeground} />,
    activeColor: colors.primary,
    activeTextColor: colors.primaryForeground,
  },
  {
    value: 'NON_CONFORMING',
    label: 'Não conf.',
    icon: <X size={14} color={colors.destructiveForeground} />,
    activeColor: colors.destructive,
    activeTextColor: colors.destructiveForeground,
  },
  {
    value: 'NOT_APPLICABLE',
    label: 'N/A',
    icon: <Minus size={14} color={colors.background} />,
    activeColor: colors.mutedForeground,
    activeTextColor: colors.background,
  },
];

const booleanOptions: ChipOption<'true' | 'false'>[] = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Não' },
];

export function ChecklistItemCard({
  index,
  item,
  answer,
  readOnly,
  onChange,
}: {
  index: number;
  item: TemplateItem;
  answer: Answer;
  readOnly: boolean;
  onChange: (patch: Partial<Answer>) => void;
}) {
  const isNonConforming = answer.conformity === 'NON_CONFORMING';

  // RN-038 / RN-039 — as exigências só valem quando a resposta é não conforme.
  const needsObservation =
    isNonConforming && !!item.observationRequiredOnFailure && !answer.observation?.trim();
  const needsEvidence =
    isNonConforming && !!item.evidenceRequiredOnFailure && !answer.evidenceUri;

  return (
    <Panel style={styles.card}>
      <View style={styles.header}>
        <View style={styles.index}>
          <Text variant="captionMedium" color="primary">
            {index + 1}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text variant="bodyMedium">{item.title}</Text>
          {item.description && (
            <Text variant="caption" color="mutedForeground">
              {item.description}
            </Text>
          )}
        </View>
        {item.required && <Badge label="Obrigatório" tone="primary" />}
      </View>

      <ResponseInput item={item} answer={answer} readOnly={readOnly} onChange={onChange} />

      {/* A observação só aparece para conformidade — nos demais tipos o valor
          já é a resposta e um campo extra só polui o formulário. */}
      {item.responseType === 'CONFORMITY' && (
        <Field
          value={answer.observation ?? ''}
          onChangeText={(text) => onChange({ observation: text })}
          placeholder={
            item.observationRequiredOnFailure
              ? 'Observação (obrigatória se não conforme)'
              : 'Observações'
          }
          multiline
          maxLength={500}
          editable={!readOnly}
          error={needsObservation ? 'Descreva a não conformidade encontrada' : undefined}
        />
      )}

      <EvidenceField
        answer={answer}
        readOnly={readOnly}
        required={needsEvidence}
        onChange={onChange}
      />
    </Panel>
  );
}

function ResponseInput({
  item,
  answer,
  readOnly,
  onChange,
}: {
  item: TemplateItem;
  answer: Answer;
  readOnly: boolean;
  onChange: (patch: Partial<Answer>) => void;
}) {
  const stamp = () => new Date().toISOString();

  if (!isSupportedResponseType(item.responseType)) {
    return (
      <View style={styles.unsupported}>
        <TriangleAlert size={16} color={colors.warning} />
        <Text variant="caption" color="warning" style={styles.unsupportedText}>
          Este item usa um tipo de resposta que esta versão do aplicativo ainda não reconhece.
          Atualize o app para respondê-lo.
        </Text>
      </View>
    );
  }

  switch (item.responseType) {
    case 'CONFORMITY':
      return (
        <ChipGroup
          columns
          options={conformityOptions}
          value={answer.conformity}
          disabled={readOnly}
          onChange={(value) => onChange({ conformity: value, answeredAtDevice: stamp() })}
        />
      );

    case 'BOOLEAN':
      return (
        <ChipGroup
          columns
          options={booleanOptions}
          value={
            answer.valueBoolean === null || answer.valueBoolean === undefined
              ? null
              : answer.valueBoolean
                ? 'true'
                : 'false'
          }
          disabled={readOnly}
          onChange={(value) =>
            onChange({ valueBoolean: value === 'true', answeredAtDevice: stamp() })
          }
        />
      );

    case 'SINGLE_CHOICE':
      return (
        <ChipGroup
          options={(item.options ?? []).map((option) => ({ value: option, label: option }))}
          value={answer.valueText}
          disabled={readOnly}
          onChange={(value) => onChange({ valueText: value, answeredAtDevice: stamp() })}
        />
      );

    case 'NUMBER':
      return (
        <Field
          value={answer.valueNumber?.toString() ?? ''}
          onChangeText={(text) => {
            const normalized = text.replace(',', '.');
            const parsed = Number.parseFloat(normalized);
            onChange({
              valueNumber: normalized === '' || Number.isNaN(parsed) ? null : parsed,
              answeredAtDevice: stamp(),
            });
          }}
          placeholder="0"
          keyboardType="decimal-pad"
          editable={!readOnly}
        />
      );

    case 'DATE':
      return (
        <Field
          value={answer.valueDate ?? ''}
          onChangeText={(text) => onChange({ valueDate: text, answeredAtDevice: stamp() })}
          placeholder="AAAA-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          editable={!readOnly}
          hint="Formato AAAA-MM-DD"
        />
      );

    case 'TEXT_LONG':
      return (
        <Field
          value={answer.valueText ?? ''}
          onChangeText={(text) => onChange({ valueText: text, answeredAtDevice: stamp() })}
          placeholder="Descreva"
          multiline
          maxLength={500}
          editable={!readOnly}
        />
      );

    case 'TEXT_SHORT':
    default:
      return (
        <Field
          value={answer.valueText ?? ''}
          onChangeText={(text) => onChange({ valueText: text, answeredAtDevice: stamp() })}
          placeholder="Resposta"
          maxLength={160}
          editable={!readOnly}
        />
      );
  }
}

/**
 * Captura de evidência.
 *
 * A foto fica como URI local: nada é enviado agora. É o comportamento que a
 * §10.14.3 descreve — o arquivo permanece no dispositivo e só sai na
 * sincronização, então trabalhar sem rede não bloqueia o registro.
 */
function EvidenceField({
  answer,
  readOnly,
  required,
  onChange,
}: {
  answer: Answer;
  readOnly: boolean;
  required: boolean;
  onChange: (patch: Partial<Answer>) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function capture() {
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        // RN-059 — recusar a permissão precisa gerar orientação, não silêncio.
        Alert.alert(
          'Permissão da câmera negada',
          'Autorize o acesso à câmera nas configurações do dispositivo para anexar evidências.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        // Qualidade reduzida por §13.10: o app não deve carregar imagens em
        // resolução integral nem estourar o limite de upload da API.
        quality: 0.6,
        allowsEditing: false,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        onChange({ evidenceUri: result.assets[0].uri });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir a câmera.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.evidence}>
      {answer.evidenceUri && (
        <View>
          <Image
            source={{ uri: answer.evidenceUri }}
            style={styles.photo}
            accessibilityLabel="Evidência fotográfica do item"
          />
          <Badge label="Aguardando envio" tone="warning" style={styles.photoBadge} />
        </View>
      )}

      {!readOnly && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={answer.evidenceUri ? 'Trocar foto' : 'Adicionar foto'}
          disabled={busy}
          onPress={capture}
          style={({ pressed }) => [
            styles.photoButton,
            required && styles.photoButtonRequired,
            pressed && styles.pressed,
          ]}
        >
          <Camera size={16} color={required ? colors.destructive : colors.mutedForeground} />
          <Text variant="caption" color={required ? 'destructive' : 'mutedForeground'}>
            {busy
              ? 'Abrindo câmera…'
              : answer.evidenceUri
                ? 'Trocar foto'
                : required
                  ? 'Foto obrigatória'
                  : 'Adicionar foto'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  index: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(243, 165, 27, 0.15)',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  unsupported: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(234, 181, 50, 0.12)',
  },
  unsupportedText: {
    flex: 1,
  },
  evidence: {
    gap: spacing.sm,
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
    backgroundColor: colors.muted,
  },
  photoBadge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  photoButtonRequired: {
    borderColor: colors.destructive,
  },
  pressed: {
    opacity: 0.7,
  },
});
