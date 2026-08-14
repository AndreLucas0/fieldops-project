import { useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState, LoadingSpinner, StatusBadge } from '@/components';
import { Button, colors, Feedback, Field, Panel, radii, spacing, Text } from '@/design-system';
import {
  matchesExpected,
  useEquipmentLookup,
} from '@/features/scanner/use-equipment-lookup';
import { getApiConfig } from '@/services';
import type { Equipment } from '@/models';

/** Código de um equipamento do backend fictício, para a leitura simulada. */
const SAMPLE_QR_CODE = 'FIELDOPS-EQ-0001';

/**
 * FE-M11 — Scanner QR.
 *
 * Lê o QR do equipamento e consulta `GET /equipment/by-qr/{qrCode}`. Quando a
 * tela é aberta a partir de uma inspeção, compara o equipamento lido com o
 * esperado antes de seguir.
 */
export default function ScannerScreen() {
  const router = useRouter();
  const { expectedEquipmentId } = useLocalSearchParams<{
    inspectionId?: string;
    /** Equipamento que a inspeção espera; sem ele a leitura é avulsa. */
    expectedEquipmentId?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const { state, lookup, reset } = useEquipmentLookup();

  const [manualCode, setManualCode] = useState('');
  const [divergenceAccepted, setDivergenceAccepted] = useState(false);
  /** Impede que a câmera dispare a mesma leitura dezenas de vezes por segundo. */
  const scanning = useRef(false);

  const config = getApiConfig();
  const cameraUnavailable = Platform.OS === 'web';

  function handleScan(code: string): void {
    if (scanning.current || state.status === 'searching') return;

    scanning.current = true;
    void lookup(code).finally(() => {
      scanning.current = false;
    });
  }

  function scanAgain(): void {
    reset();
    setDivergenceAccepted(false);
    setManualCode('');
  }

  const equipment = state.status === 'found' ? state.equipment : null;
  const diverges = equipment ? !matchesExpected(equipment, expectedEquipmentId) : false;
  const showDivergence = diverges && !divergenceAccepted;

  if (!permission && !cameraUnavailable) {
    return <LoadingSpinner testID="scanner-permissao-carregando" message="Verificando a câmera…" />;
  }

  const cameraReady = !cameraUnavailable && permission?.granted === true;

  return (
    <View style={styles.root}>
      {cameraReady && !equipment ? (
        <CameraView
          testID="scanner-camera"
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => handleScan(data)}>
          <View style={styles.frame} />
          <Text variant="caption" style={styles.hint}>
            Aponte para o QR Code do equipamento
          </Text>
        </CameraView>
      ) : null}

      {!cameraReady && !equipment ? (
        <View style={styles.fallback}>
          <EmptyState
            testID="scanner-sem-camera"
            icon="camera"
            title={cameraUnavailable ? 'Câmera indisponível aqui' : 'Permissão da câmera'}
            message={
              cameraUnavailable
                ? 'A leitura de QR Code depende da câmera do aparelho. No navegador, informe o código manualmente.'
                : 'Autorize o uso da câmera para ler o QR Code do equipamento.'
            }
            actionLabel={cameraUnavailable ? undefined : 'Autorizar câmera'}
            onAction={() => void requestPermission()}
          />
        </View>
      ) : null}

      <View style={styles.panel}>
        {state.status === 'searching' ? (
          <LoadingSpinner testID="scanner-buscando" variant="inline" message="Consultando…" />
        ) : null}

        {state.status === 'not-found' ? (
          <Feedback
            testID="scanner-nao-encontrado"
            tone="error"
            message={`Equipamento não localizado para o código ${state.qrCode}.`}
          />
        ) : null}

        {state.status === 'error' ? (
          <Feedback testID="scanner-erro" tone="error" message={state.error.message} />
        ) : null}

        {equipment ? (
          <EquipmentCard equipment={equipment} diverges={diverges} />
        ) : (
          <View style={styles.manual}>
            <Field
              testID="scanner-codigo"
              label="Código do equipamento"
              placeholder="Ex.: FIELDOPS-EQ-0001"
              autoCapitalize="characters"
              autoCorrect={false}
              value={manualCode}
              onChangeText={setManualCode}
              onSubmitEditing={() => handleScan(manualCode)}
            />

            <View style={styles.manualActions}>
              <Button
                testID="scanner-buscar"
                label="Buscar"
                onPress={() => handleScan(manualCode)}
                style={styles.manualButton}
              />

              {config.mockEnabled ? (
                <Button
                  testID="scanner-simular"
                  label="Simular leitura"
                  variant="outline"
                  onPress={() => handleScan(SAMPLE_QR_CODE)}
                  style={styles.manualButton}
                />
              ) : null}
            </View>
          </View>
        )}

        {state.status !== 'idle' ? (
          <Button
            testID="scanner-novamente"
            label="Ler outro código"
            variant="ghost"
            onPress={scanAgain}
          />
        ) : null}
      </View>

      <Modal
        visible={showDivergence}
        transparent
        animationType="fade"
        onRequestClose={() => router.back()}>
        <View style={styles.backdrop}>
          <Panel testID="scanner-divergencia" tone="raised" style={styles.dialog}>
            <Text variant="subtitle">Equipamento diferente</Text>
            <Text variant="caption" tone="muted">
              O código lido não corresponde ao equipamento previsto para esta inspeção. Continuar
              pode registrar a inspeção no ativo errado.
            </Text>

            {/*
              TODO: PEND-F03 — não há regra parametrizada dizendo se a
              divergência bloqueia ou apenas alerta. Por ora alerta e deixa a
              decisão com o técnico.
            */}
            <View style={styles.dialogActions}>
              <Button
                testID="scanner-divergencia-cancelar"
                label="Ler outro"
                variant="outline"
                onPress={scanAgain}
                style={styles.dialogButton}
              />
              <Button
                testID="scanner-divergencia-continuar"
                label="Continuar"
                onPress={() => setDivergenceAccepted(true)}
                style={styles.dialogButton}
              />
            </View>
          </Panel>
        </View>
      </Modal>
    </View>
  );
}

function EquipmentCard({ equipment, diverges }: { equipment: Equipment; diverges: boolean }) {
  return (
    <Panel testID="scanner-equipamento" style={styles.card}>
      <View style={styles.cardHeader}>
        <Text variant="subtitle" numberOfLines={2} style={styles.cardTitle}>
          {equipment.name}
        </Text>
        <StatusBadge value={equipment.status} context="equipment" size="sm" />
      </View>

      <Row label="Patrimônio" value={equipment.assetNumber} />
      <Row label="Número de série" value={equipment.serialNumber} />
      <Row label="Fabricante" value={equipment.manufacturer} />
      <Row label="Modelo" value={equipment.model} />
      <Row label="QR Code" value={equipment.qrCode} />

      {diverges ? (
        <Text testID="scanner-aviso-divergencia" variant="caption" tone="danger">
          Este não é o equipamento previsto para a inspeção.
        </Text>
      ) : null}
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="caption">{value ?? '—'}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  frame: {
    width: '65%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.xl,
  },
  hint: {
    color: '#ffffff',
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
  manual: {
    gap: spacing.md,
  },
  manualActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  manualButton: {
    flex: 1,
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.xl,
  },
  dialog: {
    width: '100%',
    gap: spacing.md,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  dialogButton: {
    flex: 1,
  },
});
