import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState } from '@/components';
import { Button, colors, Feedback, Field, spacing, Text } from '@/design-system';

/**
 * FE-M12 — Captura de evidência.
 *
 * Câmera para registrar na hora, galeria para o que já foi fotografado. A
 * descrição é opcional e segue junto para a prévia, onde o envio acontece.
 */
export default function EvidenceCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    inspectionId: string;
    origin?: string;
    inspectionItemId?: string;
    responseId?: string;
    nonConformityId?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // A câmera embutida não é confiável no navegador; ali a galeria (que vira um
  // seletor de arquivo) é o caminho previsível.
  const cameraUnavailable = Platform.OS === 'web';
  const cameraReady = !cameraUnavailable && permission?.granted === true;

  function goToPreview(uri: string): void {
    router.push({
      pathname: '/evidence/preview',
      params: {
        ...params,
        uri,
        ...(description.trim() ? { description: description.trim() } : {}),
      },
    });
  }

  async function takePhoto(): Promise<void> {
    if (busy) return;

    setBusy(true);
    setFailure(null);

    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) goToPreview(photo.uri);
      else setFailure('Não foi possível capturar a foto. Tente novamente.');
    } catch {
      setFailure('Não foi possível capturar a foto. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function pickFromGallery(): Promise<void> {
    if (busy) return;

    setBusy(true);
    setFailure(null);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      const asset = result.canceled ? null : result.assets[0];
      if (asset?.uri) goToPreview(asset.uri);
    } catch {
      setFailure('Não foi possível abrir a galeria.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      {cameraReady ? (
        <CameraView testID="captura-camera" ref={cameraRef} style={styles.camera} facing="back" />
      ) : (
        <View style={styles.fallback}>
          <EmptyState
            testID="captura-sem-camera"
            icon="camera"
            title={cameraUnavailable ? 'Câmera indisponível aqui' : 'Permissão da câmera'}
            message={
              cameraUnavailable
                ? 'No navegador, escolha uma imagem pela galeria.'
                : 'Autorize o uso da câmera para fotografar a evidência.'
            }
            actionLabel={cameraUnavailable ? undefined : 'Autorizar câmera'}
            onAction={() => void requestPermission()}
          />
        </View>
      )}

      <View style={styles.panel}>
        <Field
          testID="captura-descricao"
          label="Descrição (opcional)"
          placeholder="O que esta foto mostra?"
          value={description}
          onChangeText={setDescription}
        />

        {failure ? <Feedback testID="captura-falha" tone="error" message={failure} /> : null}

        <View style={styles.actions}>
          {cameraReady ? (
            <Button
              testID="captura-fotografar"
              label="Fotografar"
              loading={busy}
              onPress={takePhoto}
              style={styles.action}
            />
          ) : null}

          <Button
            testID="captura-galeria"
            label="Escolher da galeria"
            variant={cameraReady ? 'outline' : 'primary'}
            disabled={busy}
            onPress={pickFromGallery}
            style={styles.action}
          />
        </View>

        <Text variant="caption" tone="muted" style={styles.hint}>
          A foto é enviada só depois da conferência na próxima tela.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
  },
  panel: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
  hint: {
    textAlign: 'center',
  },
});
