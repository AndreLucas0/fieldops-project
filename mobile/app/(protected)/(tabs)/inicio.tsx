import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  EmptyState,
  ErrorState,
  InspectionCard,
  LoadingSpinner,
} from '@/components';
import { Button, colors, Panel, spacing, Text } from '@/design-system';
import { firstName } from '@/domain/auth';
import { useSession } from '@/features/auth/session-context';
import { useInspections } from '@/features/inspections/use-inspections';
import type { Inspection } from '@/models';

/** Duração da sincronização simulada (FE-M04 ainda não existe). */
const SYNC_SIMULATION_MS = 2_000;

/**
 * FE-M02 — Início.
 *
 * Três recortes da mesma lista, na ordem em que o técnico decide o que fazer:
 * o que está atrasado, o que já começou e o que é para hoje.
 */
export default function InicioScreen() {
  const router = useRouter();
  // As abas não têm cabeçalho nativo, então a área segura é responsabilidade
  // da própria tela.
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { groups, loading, error, refreshing, reload, refresh } = useInspections();

  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  if (!session) return null;

  const { user } = session;

  function openInspection(inspection: Inspection): void {
    // Forma tipada da rota dinâmica: interpolar a string não satisfaz o
    // `typedRoutes`, que exige o padrão do arquivo mais os parâmetros.
    router.push({
      pathname: '/inspections/[inspectionId]',
      params: { inspectionId: inspection.id },
    });
  }

  /**
   * Não existe motor de sincronização neste app — cada chamada vai direto à
   * API. O botão recarrega a lista e mostra o tempo de espera para que o fluxo
   * da tela já esteja montado quando o envio em lote existir (FE-M04).
   */
  async function handleSync(): Promise<void> {
    if (syncing) return;

    setSyncing(true);
    try {
      refresh();
      await new Promise((resolve) => setTimeout(resolve, SYNC_SIMULATION_MS));
      setSyncedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setSyncing(false);
    }
  }

  const empty =
    groups.overdue.length === 0 && groups.inProgress.length === 0 && groups.today.length === 0;

  return (
    <ScrollView
      testID="inicio-screen"
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing && !syncing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }>
      <View style={styles.greeting}>
        <Text variant="title">Olá, {firstName(user)}.</Text>
        <Text variant="caption" tone="muted">
          {user.email}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          testID="inicio-scanner"
          label="Ler QR Code"
          variant="secondary"
          onPress={() => router.push('/scanner')}
          style={styles.action}
        />
        <Button
          testID="inicio-sync"
          label={syncing ? 'Sincronizando…' : 'Sincronizar'}
          variant="outline"
          loading={syncing}
          onPress={handleSync}
          style={styles.action}
        />
      </View>

      {syncedAt && !syncing ? (
        <Text testID="inicio-synced-at" variant="caption" tone="success">
          Sincronizado às {syncedAt}.
        </Text>
      ) : null}

      {loading ? (
        <LoadingSpinner testID="inicio-loading" message="Buscando suas inspeções…" />
      ) : error ? (
        <ErrorState
          testID="inicio-error"
          message={error.message}
          requestId={error.requestId ?? null}
          onRetry={reload}
        />
      ) : empty ? (
        <EmptyState
          testID="inicio-empty"
          title="Nenhuma inspeção atribuída"
          message="Quando o supervisor atribuir uma inspeção a você, ela aparece aqui."
          actionLabel="Atualizar"
          onAction={reload}
        />
      ) : (
        <View style={styles.groups}>
          <InspectionGroup
            testID="inicio-overdue"
            title="Atrasadas"
            hint="Passou do horário agendado e ainda não foram concluídas."
            inspections={groups.overdue}
            onPress={openInspection}
          />
          <InspectionGroup
            testID="inicio-in-progress"
            title="Em andamento"
            hint="Checklist começado, aguardando conclusão."
            inspections={groups.inProgress}
            onPress={openInspection}
          />
          <InspectionGroup
            testID="inicio-today"
            title="Hoje"
            hint="Agendadas para hoje."
            inspections={groups.today}
            onPress={openInspection}
          />
        </View>
      )}
    </ScrollView>
  );
}

type InspectionGroupProps = {
  title: string;
  hint: string;
  inspections: readonly Inspection[];
  onPress: (inspection: Inspection) => void;
  testID: string;
};

/** Grupo vazio some da tela: uma seção "Atrasadas (0)" só ocupa espaço. */
function InspectionGroup({ title, hint, inspections, onPress, testID }: InspectionGroupProps) {
  if (inspections.length === 0) return null;

  return (
    <Panel testID={testID} style={styles.group}>
      <View style={styles.groupHeader}>
        <Text variant="subtitle">
          {title} ({inspections.length})
        </Text>
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      </View>

      {inspections.map((inspection) => (
        <InspectionCard
          key={inspection.id}
          testID={`${testID}-card-${inspection.id}`}
          inspection={inspection}
          onPress={onPress}
        />
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  greeting: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
  groups: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.md,
  },
  groupHeader: {
    gap: spacing.xs,
  },
});
